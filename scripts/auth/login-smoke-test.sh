#!/usr/bin/env bash
# scripts/auth/login-smoke-test.sh
#
# Simulate a human user clicking "Sign in" on the Agentyx portal and exercise
# the full auth + proxy/routing path. No browser required — pure curl.
#
# What it does, in order:
#   1.  GET  $PORTAL_BASE/                       (follow redirects, like a browser)
#   2.  Detect the auth backend the portal SDK targets by inspecting
#       window.location.origin/api/auth/sign-in/email vs. $AUTH_BASE.
#   3.  POST $AUTH_BASE/api/auth/sign-in/email   (Better Auth email/password)
#   4.  GET  $AUTH_BASE/api/auth/get-session     (verify cookie)
#   5.  GET  $AUTH_BASE/api/auth/forward-auth    (Caddy gate)
#   6.  GET  $AUTH_BASE/proxy/{n8n,flowise,paperclip,librechat}/  (path proxy)
#   7.  GET  https://demo.{n8n,flowise,paperclip,chat,portal}.agentyx.one/
#   8.  GET  $PORTAL_BASE/dashboard              (server-rendered protected page)
#
# Usage:
#   scripts/auth/login-smoke-test.sh \
#     --email vflores@levinnovation.com \
#     --password 'Master2025'
#
# Optional flags:
#   --auth-base   <url>   default: https://demo.auth.agentyx.one
#   --portal-base <url>   default: https://demo.portal.agentyx.one
#   --domain      <fqdn>  default: agentyx.one  (used for demo.* subdomain probes)
#   --tenant-prefix <s>   default: demo         (e.g. demo.n8n.agentyx.one)
#   --keep                keep /tmp working dir after run
#
# Exit code: 0 if login + get-session succeed, 1 otherwise.

set -euo pipefail

# ----- defaults -----
EMAIL=""
PASSWORD=""
AUTH_BASE="https://demo.auth.agentyx.one"
PORTAL_BASE="https://demo.portal.agentyx.one"
DOMAIN="agentyx.one"
TENANT_PREFIX="demo"
KEEP="false"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# ----- args -----
while [[ $# -gt 0 ]]; do
    case "$1" in
        --email)         EMAIL="$2"; shift 2 ;;
        --password)      PASSWORD="$2"; shift 2 ;;
        --auth-base)     AUTH_BASE="${2%/}"; shift 2 ;;
        --portal-base)   PORTAL_BASE="${2%/}"; shift 2 ;;
        --domain)        DOMAIN="$2"; shift 2 ;;
        --tenant-prefix) TENANT_PREFIX="$2"; shift 2 ;;
        --keep)          KEEP="true"; shift ;;
        -h|--help)
            grep -E "^# " "$0" | sed -E "s/^# ?//"
            exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
    echo "Usage: $0 --email <addr> --password <pw> [--auth-base <url>] [--portal-base <url>]" >&2
    exit 1
fi

# ----- terminal styling (no-op if not a tty) -----
if [[ -t 1 ]]; then
    BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
    GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; CYAN=$'\033[36m'
else
    BOLD=""; DIM=""; RESET=""; GREEN=""; RED=""; YELLOW=""; CYAN=""
fi

ok()   { echo "  ${GREEN}✓${RESET} $*"; }
bad()  { echo "  ${RED}✗${RESET} $*"; }
warn() { echo "  ${YELLOW}!${RESET} $*"; }
hdr()  { echo ""; echo "${BOLD}${CYAN}== $* ==${RESET}"; }

# ----- temp dir -----
WORK="$(mktemp -d -t agentyx-auth-smoke-XXXXXX)"
JAR="$WORK/cookies.txt"
HDR="$WORK/headers.txt"
trap '[[ "$KEEP" == "true" ]] && echo "kept: $WORK" || rm -rf "$WORK"' EXIT

CURL_BIN="$(command -v curl)"
if [[ -z "$CURL_BIN" ]]; then
    echo "curl not found in PATH" >&2; exit 1
fi

curl_browser() {
    "$CURL_BIN" -sS -A "$UA" \
        -H "Accept: text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" \
        -H "Accept-Language: en-US,en;q=0.9" \
        "$@"
}

# ----- 1. Visit the portal like a human -----
hdr "1. GET $PORTAL_BASE/  (browser landing)"
status=$(curl_browser -L -c "$JAR" -b "$JAR" -D "$HDR" \
            -o "$WORK/portal_home.html" -w "%{http_code}" \
            --max-time 15 "$PORTAL_BASE/")
final=$( { grep -iE "^location:" "$HDR" || true; } | tail -1 | tr -d "\r" | sed "s/^[Ll]ocation: //")
title=$( { grep -oE "<title>[^<]+</title>" "$WORK/portal_home.html" || true; } | head -1)
echo "  final status: $status   redirect chain ends at: ${final:-<no redirect>}"
echo "  page title:   $title"

# ----- 2. Detect what the portal client SDK actually calls -----
hdr "2. Inferring auth backend from portal /login bundle"
chunk_path=$( { grep -oE "/_next/static/chunks/app/login/page-[a-z0-9]+\.js" "$WORK/portal_home.html" || true; } | head -1)
if [[ -n "$chunk_path" ]]; then
    curl_browser -o "$WORK/login_chunk.js" --max-time 12 "$PORTAL_BASE${chunk_path}" || true
    base_url=$(grep -oE "baseURL:[a-zA-Z0-9_.]+\.env\.[A-Z_]+" "$WORK/login_chunk.js" 2>/dev/null || true)
    echo "  login bundle:        ${chunk_path}"
    echo "  baseURL expression:  ${base_url:-<not found>}"
    embedded=$(grep -oE "https://[a-zA-Z0-9.-]+\.(${DOMAIN//./\\.}|up\.railway\.app)[a-zA-Z0-9/_.-]*" "$WORK/login_chunk.js" 2>/dev/null | sort -u | head -3 || true)
    if [[ -n "$embedded" ]]; then
        ok "embedded auth host(s) found in bundle:"
        echo "$embedded" | sed "s/^/      /"
    else
        warn "no embedded auth host in bundle — portal SDK will fall back to window.location.origin"
        warn "i.e. it will POST to: ${PORTAL_BASE}/api/auth/sign-in/email (which 404s on the portal)"
    fi
else
    warn "could not locate the login chunk in HTML — skipping bundle introspection"
fi

# ----- 3. Sign in like a browser would -----
hdr "3. POST $AUTH_BASE/api/auth/sign-in/email  (email + password)"
rm -f "$JAR" "$HDR"
payload=$(printf '{"email":"%s","password":"%s","callbackURL":"/dashboard"}' "$EMAIL" "$PASSWORD")
status=$("$CURL_BIN" -sS -A "$UA" \
    -H "Content-Type: application/json" \
    -H "Origin: $PORTAL_BASE" \
    -H "Referer: $PORTAL_BASE/login" \
    -c "$JAR" -b "$JAR" \
    -D "$HDR" -o "$WORK/signin.json" \
    -w "%{http_code}" \
    --max-time 20 \
    --data-binary "$payload" \
    "$AUTH_BASE/api/auth/sign-in/email")
echo "  status: $status"
grep -i "^set-cookie:" "$HDR" | sed "s/^/    /" || true
echo "  body (first 280 chars):"
head -c 280 "$WORK/signin.json"; echo ""
if [[ "$status" != "200" ]]; then
    bad "sign-in did not return 200; aborting downstream checks"
    exit 1
fi
ok "sign-in succeeded"

# ----- 4. Verify session with the cookie -----
hdr "4. GET $AUTH_BASE/api/auth/get-session  (with cookie)"
status=$("$CURL_BIN" -sS -A "$UA" -b "$JAR" \
    -o "$WORK/session.json" -w "%{http_code}" \
    --max-time 12 \
    "$AUTH_BASE/api/auth/get-session")
echo "  status: $status"
if [[ "$status" == "200" ]]; then
    body="$(cat "$WORK/session.json")"
    if [[ "$body" == "null" || -z "$body" ]]; then
        bad "session is null — cookie not honored"
    else
        user_email=$(printf "%s" "$body" | sed -nE 's/.*"email":"([^"]+)".*/\1/p' | head -1)
        user_role=$(printf "%s"  "$body" | sed -nE 's/.*"role":"([^"]+)".*/\1/p'  | head -1)
        ok "session valid — user=$user_email role=${user_role:-<none>}"
    fi
else
    bad "get-session failed"
fi

# ----- 5. Forward-auth (Caddy gate) -----
hdr "5. GET $AUTH_BASE/api/auth/forward-auth  (Caddy gate check)"
status=$("$CURL_BIN" -sS -A "$UA" -b "$JAR" \
    -D "$WORK/fa.hdr" -o "$WORK/fa.body" \
    -w "%{http_code}" --max-time 10 \
    "$AUTH_BASE/api/auth/forward-auth")
echo "  status: $status"
if [[ "$status" == "200" ]]; then
    grep -iE "^x-auth-(user|email):" "$WORK/fa.hdr" | sed "s/^/    /" || true
    ok "forward-auth gate would allow downstream services"
elif [[ "$status" == "404" ]]; then
    warn "forward-auth endpoint not implemented on $AUTH_BASE (legacy gateway uses /proxy/* instead)"
else
    bad "forward-auth refused (status $status)"
fi

# ----- 6. Path proxy -----
hdr "6. GET $AUTH_BASE/proxy/{svc}/  (legacy path-proxy)"
for svc in n8n flowise paperclip librechat; do
    code=$("$CURL_BIN" -sS -A "$UA" -b "$JAR" -o "$WORK/proxy_$svc.html" \
        -w "%{http_code}" --max-time 12 "$AUTH_BASE/proxy/$svc/")
    size=$(wc -c < "$WORK/proxy_$svc.html" | tr -d " ")
    [[ "$code" =~ ^2 ]] && ok "proxy/$svc/ -> $code (${size}B)" || bad "proxy/$svc/ -> $code (${size}B)"
done

# ----- 7. Custom subdomains -----
hdr "7. Custom subdomains (cookie domain=.${DOMAIN})"
for sub in n8n flowise paperclip chat portal; do
    url="https://${TENANT_PREFIX}.${sub}.${DOMAIN}/"
    code=$("$CURL_BIN" -sS -A "$UA" -b "$JAR" -L \
        -o "$WORK/sub_$sub.html" -w "%{http_code}" --max-time 12 "$url")
    size=$(wc -c < "$WORK/sub_$sub.html" | tr -d " ")
    title=$( { grep -oE "<title>[^<]+</title>" "$WORK/sub_$sub.html" || true; } | head -1)
    [[ "$code" =~ ^2 ]] && ok "$url -> $code (${size}B) ${title}" || bad "$url -> $code (${size}B) ${title}"
done

# ----- 8. Portal /dashboard SSR with cookie -----
hdr "8. GET $PORTAL_BASE/dashboard  (Next.js SSR with cookie)"
"$CURL_BIN" -sS -A "$UA" -b "$JAR" -L \
    -D "$WORK/dash.hdr" -o "$WORK/dash.html" \
    -w "  final_status=%{http_code}  url=%{url_effective}\n" \
    --max-time 15 \
    "$PORTAL_BASE/dashboard"
final_url=$( { grep -iE "^location:" "$WORK/dash.hdr" || true; } | tail -1 | tr -d "\r" | sed "s/^[Ll]ocation: //")
title=$( { grep -oE "<title>[^<]+</title>" "$WORK/dash.html" || true; } | head -1)
if echo "$final_url" | grep -q "/login"; then
    bad "portal redirected back to /login — Next.js SSR did not honor better-auth cookie"
    bad "  → portal needs a server-side session check that reads the better-auth cookie domain (.${DOMAIN})"
else
    ok "portal /dashboard rendered authenticated content; title: $title"
fi

echo ""
echo "${BOLD}Done.${RESET}  Working dir: ${WORK} (use --keep to preserve)"
