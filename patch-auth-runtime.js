#!/usr/bin/env node
/**
 * Runtime patch for n8n auth service (minified JS compatible).
 * Uses string replacement on the compiled/minified auth.service.js.
 */

const fs = require('fs');

const AUTH_SERVICE_PATHS = [
    '/usr/local/lib/node_modules/n8n/dist/auth/auth.service.js',
    '/usr/local/lib/node_modules/n8n/dist/packages/cli/src/auth/auth.service.js',
];

function findAuthService() {
    for (const p of AUTH_SERVICE_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

const filePath = findAuthService();
if (!filePath) {
    console.warn('[n8n-patch] auth.service.js not found, skipping patch');
    process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('TRUSTED_PROXY_SSO_PATCH')) {
    console.log('[n8n-patch] Already patched');
    process.exit(0);
}

// Support both minified and formatted builds where createAuthMiddleware
// returns an async middleware function.
const injectionPattern = /return\s+async\s*\(\s*([^)]*?)\s*\)\s*=>\s*\{/;
const match = content.match(injectionPattern);

if (!match) {
    console.warn('[n8n-patch] Could not find createAuthMiddleware async return, skipping patch');
    process.exit(0);
}

const rawParams = match[1].split(',').map((p) => p.trim()).filter(Boolean);
const reqVar = rawParams[0] || 'req';
const resVar = rawParams[1] || 'res';

const patchCode = `
/*TRUSTED_PROXY_SSO_PATCH*/
const proxyEmail=${reqVar}.header("x-auth-email");
const proxySecret=${reqVar}.header("x-auth-proxy-secret");
const expectedSecret=process.env.N8N_AUTH_TRUSTED_PROXY_SECRET;
if(proxyEmail&&(!expectedSecret||proxySecret===expectedSecret)&&!${reqVar}.user){
  try{
    const user=await this.userRepository.findOne({where:{email:proxyEmail.toLowerCase()},select:["id","email","password","firstName","lastName","disabled","mfaEnabled"]});
    if(user){
      const jwtToken=this.issueJWT(user,false);
      const{samesite,secure}=this.globalConfig.auth.cookie;
      ${resVar}.cookie(AUTH_COOKIE_NAME,jwtToken,{maxAge:this.jwtExpiration*Time.seconds.toMilliseconds,httpOnly:true,sameSite:samesite,secure});
      ${reqVar}.user=user;
      ${reqVar}.authInfo={usedMfa:false};
    }
  }catch(err){
    this.logger.warn("Trusted proxy auth failed",{error:err?.message});
  }
}
`;

// Insert the patch right after the opening brace of the async function.
content = content.replace(injectionPattern, (fullMatch) => `${fullMatch}${patchCode}`);

// Also fix user.role -> user.roleSlug in user.repository.js
const userRepoPaths = [
    filePath.replace('auth/auth.service.js', 'repositories/user.repository.js'),
    '/usr/local/lib/node_modules/n8n/dist/repositories/user.repository.js',
];

for (const userRepoPath of userRepoPaths) {
    if (fs.existsSync(userRepoPath)) {
        let repoContent = fs.readFileSync(userRepoPath, 'utf8');
        if (!repoContent.includes('ROLESLUG_PATCH')) {
            repoContent = repoContent
                .replace(/user\.role = :role/g, 'user.roleSlug = :role /*ROLESLUG_PATCH*/')
                .replace(/user\.role <> :role/g, 'user.roleSlug <> :role /*ROLESLUG_PATCH*/')
                .replace(/user\.role <> :ownerRole/g, 'user.roleSlug <> :ownerRole /*ROLESLUG_PATCH*/')
                .replace(/user\.role='global:owner'/g, "user.roleSlug='global:owner' /*ROLESLUG_PATCH*/")
                .replace(/user\.role='global:admin'/g, "user.roleSlug='global:admin' /*ROLESLUG_PATCH*/");
            fs.writeFileSync(userRepoPath, repoContent);
            console.log('[n8n-patch] Patched user.repository.js');
        }
    }
}

fs.writeFileSync(filePath, content);
console.log('[n8n-patch] Patched auth.service.js');
