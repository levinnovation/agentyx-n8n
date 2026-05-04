"""
Better Auth JWT verification middleware for FastAPI agents.

Validates Bearer tokens via JWKS endpoint.
"""

from __future__ import annotations

import time
from typing import Optional

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.exceptions import JWTError

from .config import (
    BETTER_AUTH_JWKS_URL,
    BETTER_AUTH_ISSUER,
    BETTER_AUTH_AUDIENCE,
    AUTH_REQUIRED,
    INTERNAL_API_KEY,
)

_JWKS_CACHE: dict = {}
_JWKS_CACHE_EXPIRY = 0
_JWKS_CACHE_TTL_SECONDS = 600

security = HTTPBearer(auto_error=False)


def _fetch_jwks() -> dict:
    """Fetch JWKS from Better Auth, with simple in-memory caching."""
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRY
    now = time.time()
    if _JWKS_CACHE and now < _JWKS_CACHE_EXPIRY:
        return _JWKS_CACHE

    import urllib.request
    import json

    req = urllib.request.Request(BETTER_AUTH_JWKS_URL, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        _JWKS_CACHE = json.loads(resp.read().decode("utf-8"))
        _JWKS_CACHE_EXPIRY = now + _JWKS_CACHE_TTL_SECONDS
        return _JWKS_CACHE


def _get_signing_key(jwks: dict, kid: str) -> Optional[dict]:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def verify_jwt(token: str) -> dict:
    """Verify a JWT and return its claims."""
    if not BETTER_AUTH_JWKS_URL:
        raise HTTPException(status_code=500, detail="BETTER_AUTH_JWKS_URL not configured")

    jwks = _fetch_jwks()
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    signing_key = _get_signing_key(jwks, kid) if kid else None

    if not signing_key:
        raise HTTPException(status_code=401, detail="Invalid token: signing key not found")

    public_key = jwk.construct(signing_key)
    payload = jwt.decode(
        token,
        public_key,
        algorithms=["RS256", "ES256"],
        issuer=BETTER_AUTH_ISSUER or None,
        audience=BETTER_AUTH_AUDIENCE or None,
    )
    return payload


async def better_auth_middleware(request: Request) -> Optional[dict]:
    """FastAPI dependency that validates Better Auth JWT if AUTH_REQUIRED is true."""
    if not AUTH_REQUIRED:
        return None

    creds: HTTPAuthorizationCredentials = await security(request)
    if not creds:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    try:
        claims = verify_jwt(creds.credentials)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    request.state.user = claims
    return claims


def verify_internal_api_key(request: Request) -> bool:
    """Verify X-Internal-Api-Key header for machine-to-machine calls."""
    key = request.headers.get("x-internal-api-key")
    if not key or key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key")
    return True
