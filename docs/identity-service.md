# Identity service

The identity service handles user registration, sign-in, token refresh, and current-user context. It backs the platform’s authentication and is the single source of identity and role (client vs worker) for API Gateway and other services.

---

## Overview

| Aspect | Detail |
|--------|--------|
| **Location** | `app/services/identity/` |
| **Runtime** | AWS Lambda (Node.js 20+, TypeScript) |
| **Auth provider** | Amazon Cognito user pool (see [ADR-003](adr/ADR-003-auth-cognito.md)) |
| **API surface** | Register, login, refresh, me — see [API contracts](04-api-contracts.md#identity). |

The service owns no database; identity and roles are stored in Cognito. The app client uses standard attributes (e.g. `email`) for read/write. Role is stored via Cognito groups (`client`, `worker`); after sign-up the user is added to the chosen group and the JWT includes `cognito:groups` for authorization.

---

## API reference

All auth routes are under `/auth/`. Base URL is the API Gateway stage URL (e.g. `https://<api-id>.execute-api.<region>.amazonaws.com/<stage>`).

### POST /auth/register

Register a new user (client or worker).

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User email (used as Cognito username). |
| `password` | string | Yes | Password (must satisfy Cognito pool policy). |
| `role` | string | No | `"client"` or `"worker"`; defaults to `"client"`. |

**Success** — `201`

```json
{
  "sub": "<cognito-user-sub-uuid>",
  "role": "client"
}
```

**Validation error** — `400`

```json
{
  "errors": [
    { "field": "email", "message": "required" },
    { "field": "password", "message": "required" }
  ]
}
```

**Conflict** — `409` (email already registered)

```json
{
  "code": "CONFLICT",
  "message": "Email already registered"
}
```

---

### POST /auth/login

Sign in with email and password.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User email. |
| `password` | string | Yes | Password. |

**Success** — `200`

```json
{
  "idToken": "<jwt>",
  "accessToken": "<jwt>",
  "refreshToken": "<opaque-token>",
  "expiresIn": 3600
}
```

- **idToken** / **accessToken**: JWTs; use `idToken` (or access token) in `Authorization: Bearer <token>` for protected APIs.
- **refreshToken**: Use with `POST /auth/refresh` to obtain new tokens without re-entering password.
- **expiresIn**: Token lifetime in seconds.

**Unauthorized** — `401` (invalid email or password)

```json
{
  "code": "UNAUTHORIZED",
  "message": "Invalid email or password"
}
```

**Validation error** — `400`: same shape as register (missing email/password).

---

### POST /auth/refresh

Issue new ID and access tokens using a refresh token.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | Yes | Token returned from login. |

**Success** — `200`

```json
{
  "idToken": "<jwt>",
  "accessToken": "<jwt>",
  "expiresIn": 3600
}
```

(Refresh token is not returned again; client keeps the same refresh token.)

**Unauthorized** — `401` (invalid or expired refresh token)

```json
{
  "code": "UNAUTHORIZED",
  "message": "Invalid or expired refresh token"
}
```

**Validation error** — `400`: `errors` with `field: "refreshToken"`, `message: "required"`.

---

### GET /auth/me

Return the current user and role. Requires a valid JWT in `Authorization: Bearer <token>` (validated by API Gateway Cognito authorizer).

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <idToken>` or `Bearer <accessToken>`. |

**Success** — `200`

```json
{
  "sub": "<cognito-user-sub-uuid>",
  "role": "client",
  "email": "user@example.com"
}
```

**Unauthorized** — `401` (missing or invalid token)

```json
{
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid token"
}
```

---

## JWT claims and authorizer

- **sub**: Cognito user UUID; use as stable user ID (e.g. `clientId` in jobs).
- **email**: From Cognito standard attribute.
- **cognito:groups**: Set at registration via Cognito groups; `["client"]` or `["worker"]` (role is derived from the first group).

API Gateway is configured with a Cognito user pool authorizer for protected routes (e.g. `/jobs`, `/auth/me`). The authorizer validates the JWT and passes claims into the request context; the identity Lambda reads them for `/auth/me`; the jobs Lambda uses `sub` for ownership.

---

## Environment variables

Set by Terraform when deploying the Lambda:

| Variable | Description |
|----------|-------------|
| `USER_POOL_ID` | Cognito user pool ID. |
| `CLIENT_ID` | Cognito app client ID (user pool client). |

---

## Build and deploy

- **Dependencies**: From repo root, `yarn install` (workspace). In `app/services/identity`: `yarn build` (TypeScript), `yarn build:lambda` (Lambda package).
- **Lambda package**: `build-lambda.sh` compiles TS, copies output and `package.json` into `build/package/`, runs `yarn install --production` there. Terraform uses this directory (or its zip) for the Lambda deployment.
- **Deploy**: Apply Terraform in `infra/`; the identity Lambda is attached to API Gateway routes under `/auth/*` and uses the Cognito authorizer for `GET /auth/me`.

---

## Related docs

- [03-service-catalog.md](03-service-catalog.md) — Identity bounded context and boundaries.
- [04-api-contracts.md](04-api-contracts.md) — Auth and API list.
- [ADR-003: Authentication — Cognito user pools](adr/ADR-003-auth-cognito.md) — Why Cognito and how JWTs are used.
