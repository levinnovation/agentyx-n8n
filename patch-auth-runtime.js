#!/usr/bin/env node
/**
 * Runtime patch for n8n auth service.
 * Injects trusted-proxy SSO logic into the compiled auth.service.js.
 */

const fs = require('fs');
const path = require('path');

const AUTH_SERVICE_PATHS = [
    '/usr/local/lib/node_modules/n8n/dist/auth/auth.service.js',
    '/usr/local/lib/node_modules/n8n/dist/packages/cli/src/auth/auth.service.js',
    '/opt/nodejs/node-v24.14.1/lib/node_modules/n8n/dist/auth/auth.service.js',
];

function findAuthService() {
    for (const p of AUTH_SERVICE_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    // Fallback: search recursively
    const baseDirs = [
        '/usr/local/lib/node_modules/n8n',
        '/opt/nodejs',
        '/home/node/.n8n',
    ];
    for (const base of baseDirs) {
        if (!fs.existsSync(base)) continue;
        const files = walkDir(base, 'auth.service.js');
        if (files.length > 0) return files[0];
    }
    return null;
}

function walkDir(dir, target) {
    const results = [];
    try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                results.push(...walkDir(full, target));
            } else if (file === target) {
                results.push(full);
            }
        }
    } catch (e) {
        // ignore permission errors
    }
    return results;
}

function patchAuthService(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already patched
    if (content.includes('TRUSTED_PROXY_SSO_PATCH')) {
        console.log('[n8n-patch] Already patched, skipping');
        return;
    }

    // The compiled JS may be minified/obfuscated. Try multiple patterns.
    const patterns = [
        /const isPreviewMode = process\.env\.N8N_PREVIEW_MODE/g,
        /const \w+ = process\.env\.N8N_PREVIEW_MODE/g,
        /process\.env\.N8N_PREVIEW_MODE/g,
    ];

    let targetPattern = null;
    for (const p of patterns) {
        if (p.test(content)) {
            targetPattern = p;
            break;
        }
    }

    if (!targetPattern) {
        console.error('[n8n-patch] Could not find injection point (N8N_PREVIEW_MODE)');
        // Log a snippet around "N8N_PREVIEW_MODE" for debugging
        const idx = content.indexOf('N8N_PREVIEW_MODE');
        if (idx >= 0) {
            console.error('[n8n-patch] Context:', content.substring(Math.max(0, idx - 100), idx + 100));
        }
        process.exit(1);
    }

    const trustedProxyCode = `
        // ─── Trusted Proxy SSO (Agentyx auth-gateway) ───────────────────
        // TRUSTED_PROXY_SSO_PATCH
        if (!req.user && !token) {
            const proxyEmail = req.header('x-auth-email');
            const proxySecret = req.header('x-auth-proxy-secret');
            const expectedSecret = process.env.N8N_AUTH_TRUSTED_PROXY_SECRET;

            if (proxyEmail && (!expectedSecret || proxySecret === expectedSecret)) {
                try {
                    const user = await this.userRepository.findOne({
                        where: { email: proxyEmail.toLowerCase() },
                        relations: ['role'],
                    });
                    if (user) {
                        // Bypass issueCookie license check for SSO gateway users.
                        const jwtToken = this.issueJWT(user, false);
                        const { samesite, secure } = this.globalConfig.auth.cookie;
                        res.cookie(AUTH_COOKIE_NAME, jwtToken, {
                            maxAge: this.jwtExpiration * Time.seconds.toMilliseconds,
                            httpOnly: true,
                            sameSite: samesite,
                            secure,
                        });
                        req.user = user;
                        req.authInfo = { usedMfa: false };
                    }
                } catch (err) {
                    this.logger.warn('Trusted proxy auth failed', { error: err.message });
                }
            }
        }
`;

    content = content.replace(targetPattern, trustedProxyCode + '        const isPreviewMode = process.env.N8N_PREVIEW_MODE');
    // Also fix any remaining user.role -> user.roleSlug in auth service
    content = content.replace(/user\.role = :role/g, 'user.roleSlug = :role /* ROLESLUG_PATCH */');
    content = content.replace(/user\.role <> :role/g, 'user.roleSlug <> :role /* ROLESLUG_PATCH */');
    content = content.replace(/user\.role <> :ownerRole/g, 'user.roleSlug <> :ownerRole /* ROLESLUG_PATCH */');
    content = content.replace(/user\.role='global:owner'/g, "user.roleSlug='global:owner' /* ROLESLUG_PATCH */");
    content = content.replace(/user\.role='global:admin'/g, "user.roleSlug='global:admin' /* ROLESLUG_PATCH */");

    fs.writeFileSync(filePath, content);
    console.log('[n8n-patch] Patched:', filePath);
}

function patchUserRepository(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('ROLESLUG_PATCH')) {
        console.log('[n8n-patch] UserRepository already patched, skipping');
        return;
    }

    // Fix user.role -> user.roleSlug in raw SQL queries
    const fixes = [
        [/user\.role = :role/g, 'user.roleSlug = :role /* ROLESLUG_PATCH */'],
        [/user\.role <> :role/g, 'user.roleSlug <> :role /* ROLESLUG_PATCH */'],
        [/user\.role <> :ownerRole/g, 'user.roleSlug <> :ownerRole /* ROLESLUG_PATCH */'],
        [/user\.role='global:owner'/g, "user.roleSlug='global:owner' /* ROLESLUG_PATCH */"],
        [/user\.role='global:admin'/g, "user.roleSlug='global:admin' /* ROLESLUG_PATCH */"],
    ];

    let patched = false;
    for (const [pattern, replacement] of fixes) {
        if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            patched = true;
        }
    }

    if (patched) {
        fs.writeFileSync(filePath, content);
        console.log('[n8n-patch] Patched UserRepository:', filePath);
    } else {
        console.log('[n8n-patch] No roleSlug fixes needed in UserRepository');
    }
}

const authServicePath = findAuthService();
if (!authServicePath) {
    console.error('[n8n-patch] Could not find auth.service.js');
    process.exit(1);
}

patchAuthService(authServicePath);

// Also patch user.repository.js if it exists
const userRepoDir = path.dirname(authServicePath);
const userRepoPath = path.join(userRepoDir, '..', 'repositories', 'user.repository.js');
if (fs.existsSync(userRepoPath)) {
    patchUserRepository(userRepoPath);
} else {
    // Search for it
    const baseDir = path.dirname(authServicePath);
    const files = walkDir(baseDir, 'user.repository.js');
    for (const f of files) {
        patchUserRepository(f);
    }
}

console.log('[n8n-patch] Done');
