# ADR-003: Authentication — Cognito user pools

**Status**: Accepted  
**Date**: 2025-02-22

## Context

We need authentication for users (job posters and gig providers). We must support sign-up, sign-in, and token-based API access without running our own auth server.

## Decision

Use **Amazon Cognito user pools** for authentication.

- **Single user pool** for all users. There is no client/worker role distinction at sign-up; any user can post jobs and take gigs. (Previously we used Cognito groups for role; that has been removed.)
- **API access**: Clients send Cognito JWT (ID or access token) in `Authorization: Bearer <token>`. API Gateway authorizer validates the token (issuer, audience) and passes claims to backends for authorization.
- **Optional**: Cognito identity pool for direct AWS access (e.g. S3 upload with temporary credentials) if needed later; document if adopted.

## Consequences

- **Positive**: Managed auth; built-in MFA and password policies; no credential storage in our DB; integrates with API Gateway.
- **Negative**: Migration path for existing users if we change auth model.
- **Neutral**: All services that need “current user” rely on JWT claims (sub, email); no shared session store.
