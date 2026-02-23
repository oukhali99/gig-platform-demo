# Identity service

Cognito-backed auth: register, login, refresh, me. Used by API Gateway with a JWT authorizer for protected routes.

## Endpoints

- `POST /auth/register` — body: `email`, `password`, `role` (client | worker). Creates user in Cognito, sets `custom:role`, auto-confirms.
- `POST /auth/login` — body: `email`, `password`. Returns `idToken`, `accessToken`, `refreshToken`, `expiresIn`.
- `POST /auth/refresh` — body: `refreshToken`. Returns new `idToken`, `accessToken`, `expiresIn`.
- `GET /auth/me` — requires `Authorization: Bearer <idToken>`. Returns `sub`, `role`, `email`.

## Build

From repo root: `yarn build` (compiles); `yarn workspace identity-service build:lambda` (builds Lambda package for Terraform).
