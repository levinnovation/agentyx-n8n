# User API Contract

Auth-service internal endpoints for user lookups by downstream apps.

## Authentication

All endpoints require the `X-Internal-Api-Key` header matching the `INTERNAL_API_KEY` env var.

## Endpoints

### GET /api/users/:sub

Return a single user by Better Auth `sub` (user ID).

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "image": "https://...",
  "organizationIds": ["org-1"],
  "roles": ["member"],
  "customClaims": {}
}
```

### GET /api/users?email=

Lookup user by email.

### POST /api/users

Create a user (used by SCIM provisioning).

**Body:**
```json
{
  "email": "user@example.com",
  "name": "User Name",
  "organizationId": "org-1"
}
```

## Error codes

- `403` — Invalid or missing `X-Internal-Api-Key`
- `404` — User not found
