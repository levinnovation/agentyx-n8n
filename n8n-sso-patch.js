#!/usr/bin/env node
/**
 * Runtime patch for n8n trusted-proxy SSO (upstream image compatible).
 * Patches the compiled auth.service.js to inject trusted-proxy auth logic.
 */

const fs = require('fs');

const AUTH_SERVICE_PATH = '/usr/local/lib/node_modules/n8n/dist/auth/auth.service.js';

if (!fs.existsSync(AUTH_SERVICE_PATH)) {
    console.error('[n8n-sso-patch] auth.service.js not found at', AUTH_SERVICE_PATH);
    process.exit(1);
}

let content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf8');

if (content.includes('/*TRUSTED_PROXY_SSO_PATCH*/')) {
    console.log('[n8n-sso-patch] Already patched');
    process.exit(0);
}

const injectionPoint = 'async authMiddleware(req, res, next) {';
if (!content.includes(injectionPoint)) {
    console.error('[n8n-sso-patch] Could not find authMiddleware injection point');
    process.exit(1);
}

const patchCode = `
        // ─── Trusted Proxy SSO (Agentyx auth-gateway) ───────────────────
        /*TRUSTED_PROXY_SSO_PATCH*/
        const proxyEmail = req.header('x-auth-email');
        const proxySecret = req.header('x-auth-proxy-secret');
        const expectedSecret = process.env.N8N_AUTH_TRUSTED_PROXY_SECRET;
        if (proxyEmail && (!expectedSecret || proxySecret === expectedSecret) && !req.user) {
            try {
                const user = await this.userRepository.findOne({
                    where: { email: proxyEmail.toLowerCase() },
                    select: ['id', 'email', 'password', 'firstName', 'lastName', 'disabled', 'mfaEnabled'],
                });
                if (user) {
                    const jwtToken = this.issueJWT(user, false);
                    res.cookie(constants_1.AUTH_COOKIE_NAME, jwtToken, {
                        maxAge: this.jwtExpiration * constants_1.Time.seconds.toMilliseconds,
                        httpOnly: true,
                        sameSite: 'lax',
                        secure: config_2.default.getEnv('secure_cookie'),
                    });
                    req.user = user;
                    req.authInfo = { usedMfa: false };
                }
            } catch (err) {
                this.logger.warn('Trusted proxy auth failed', { error: err.message });
            }
        }
`;

content = content.replace(injectionPoint, injectionPoint + patchCode);
fs.writeFileSync(AUTH_SERVICE_PATH, content);
console.log('[n8n-sso-patch] Patched auth.service.js');
