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
    console.error('[n8n-patch] auth.service.js not found');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('TRUSTED_PROXY_SSO_PATCH')) {
    console.log('[n8n-patch] Already patched');
    process.exit(0);
}

// The minified code has createAuthMiddleware returning an async function.
// We need to inject our trusted-proxy code right after `next)=>{` in that function.
// Pattern: `return async(req,res,next)=>{const token=req.cookies[...`
const injectionPattern = /return async\((\w+),(\w+),(\w+)\)=>\{const (\w+)=\4\.cookies\[/;

if (!injectionPattern.test(content)) {
    console.error('[n8n-patch] Could not find injection pattern in minified code');
    process.exit(1);
}

const patchCode = `
const proxyEmail=req.header("x-auth-email");
const proxySecret=req.header("x-auth-proxy-secret");
const expectedSecret=process.env.N8N_AUTH_TRUSTED_PROXY_SECRET;
if(proxyEmail&&(!expectedSecret||proxySecret===expectedSecret)){
  try{
    const user=await this.userRepository.findOne({where:{email:proxyEmail.toLowerCase()},relations:["role"]});
    if(user){
      const jwtToken=this.issueJWT(user,false);
      const{sameSite:samesite,secure}=this.globalConfig.auth.cookie;
      res.cookie(AUTH_COOKIE_NAME,jwtToken,{maxAge:this.jwtExpiration*Time.seconds.toMilliseconds,httpOnly:true,sameSite:samesite,secure});
      req.user=user;
      req.authInfo={usedMfa:false};
    }
  }catch(err){}
}
`;

// Insert the patch right after the opening brace of the async function
content = content.replace(injectionPattern, (match) => match + patchCode + '//TRUSTED_PROXY_SSO_PATCH');

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
