# ADR-003: Authentication — Cognito user pools

**Status**: Accepted  
**Date**: 2025-02-22

## Context

We need authentication for clients (job posters) and workers (gig providers). We must support sign-up, sign-in, and token-based API access without running our own auth server.

## Decision

Use **Amazon Cognito user pools** for authentication.

- **Single user pool** for both clients and workers; distinguish role via a custom attribute or Cognito group (e.g. `custom:role` or group `client` / `worker`). This keeps one sign-in experience and one JWT issuer for API Gateway to validate.
- **API access**: Clients send Cognito JWT (ID or access token) in `Authorization: Bearer <token>`. API Gateway authorizer validates the token (issuer, audience) and passes claims to backends for authorization.
- **Optional**: Cognito identity pool for direct AWS access (e.g. S3 upload with temporary credentials) if needed later; document if adopted.

## Consequences

- **Positive**: Managed auth; built-in MFA and password policies; no credential storage in our DB; integrates with API Gateway.
- **Negative**: Custom attribute/group must be kept in sync with app logic; migration path for existing users if we ever have any.
- **Neutral**: All services that need “current user” rely on JWT claims (sub, role); no shared session store.
