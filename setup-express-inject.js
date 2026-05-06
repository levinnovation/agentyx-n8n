#!/usr/bin/env node
/**
 * Runtime Express middleware injection for n8n trusted-proxy SSO.
 * Monkey-patches app.use() to inject trusted-proxy auth before n8n's auth middleware.
 */

const fs = require('fs');
const path = require('path');

const INJECT_FILE = '/tmp/trusted-proxy-inject.js';

const injectCode = `
const http = require('http');
const https = require('https');

// ─── Trusted Proxy SSO Injector ───────────────────────────────────
// Monkey-patch express.Application.use to inject our middleware
// before n8n's auth middleware.

function findAuthMiddlewareIndex(stack) {
    for (let i = 0; i < stack.length; i++) {
        const layer = stack[i];
        if (!layer) continue;
        const name = layer.name || (layer.handle && layer.handle.name) || '';
        const fn = String(layer.handle || '');
        // Look for n8n auth middleware patterns
        if (name.includes('Auth') || name.includes('auth') ||
            fn.includes('AUTH_COOKIE_NAME') ||
            fn.includes('authenticateUserBasedOnToken') ||
            fn.includes('createAuthMiddleware')) {
            return i;
        }
    }
    return -1;
}

const originalUse = require('express').application.use;
require('express').application.use = function(...args) {
    const result = originalUse.apply(this, args);
    const stack = this._router && this._router.stack;
    if (stack && !this.__trustedProxyPatched) {
        const idx = findAuthMiddlewareIndex(stack);
        if (idx >= 0) {
            const proxyMiddleware = async (req, res, next) => {
                const proxyEmail = req.headers['x-auth-email'];
                const proxySecret = req.headers['x-auth-proxy-secret'];
                const expectedSecret = process.env.N8N_AUTH_TRUSTED_PROXY_SECRET;
                if (proxyEmail && (!expectedSecret || proxySecret === expectedSecret)) {
                    try {
                        // Call n8n's internal login endpoint to get a session
                        const postData = JSON.stringify({ email: proxyEmail, password: process.env.N8N_TRUSTED_PROXY_PASSWORD || '' });
                        const options = {
                            hostname: 'localhost',
                            port: process.env.N8N_PORT || 5678,
                            path: '/rest/login',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': Buffer.byteLength(postData),
                            },
                        };
                        const proxyReq = http.request(options, (proxyRes) => {
                            const setCookie = proxyRes.headers['set-cookie'];
                            if (setCookie) {
                                res.setHeader('Set-Cookie', setCookie);
                            }
                            next();
                        });
                        proxyReq.on('error', () => next());
                        proxyReq.write(postData);
                        proxyReq.end();
                        return;
                    } catch (e) {
                        // fall through
                    }
                }
                next();
            };
            stack.splice(idx, 0, {
                handle: proxyMiddleware,
                name: 'trustedProxySSO',
                params: undefined,
                path: undefined,
                keys: [],
                regexp: { fast_star: false, fast_slash: false },
                route: undefined,
            });
            this.__trustedProxyPatched = true;
            console.log('[n8n-sso] Trusted-proxy middleware injected before auth middleware');
        }
    }
    return result;
};
`;

fs.writeFileSync(INJECT_FILE, injectCode);
console.log('[n8n-inject] Written:', INJECT_FILE);
