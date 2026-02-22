# Security and compliance

## Authentication

- **Mechanism**: AWS Cognito user pools.
- **Clients and workers**: Same user pool with a **role** (e.g. `client`, `worker`) stored in a custom attribute or Cognito group.
- **Tokens**: Clients send ID token or access token in `Authorization: Bearer <token>`; API Gateway validates JWT (Cognito issuer, audience).
- **Optional**: Identity pool for direct AWS resource access (e.g. S3 uploads) if needed; document in ADR.

---

## Authorization

- **Coarse rules**:
  - Only the job owner (client) can update/cancel their job, confirm a booking, release payment.
  - Only the assigned worker can mark booking in progress or completed (or agreed flow).
  - Workers can only update their own profile; clients can view public worker profiles.
- **Implementation**: Validate JWT claims (sub, role/custom attribute) in each service or in a shared authorizer; reject with 403 when not allowed.
- **Admin**: If admin role exists, restrict admin APIs by role and audit access.

---

## Network

- **Public entry**: Only through API Gateway; no direct exposure of Lambda URLs or ECS tasks.
- **Internal services**: If Lambda or ECS need to call each other, use VPC and private endpoints or IAM-secured APIs; no database in public subnet.
- **Databases**: Not directly reachable from the internet; only from within VPC (Lambda VPC or ECS).

---

## Secrets

- **No secrets in code or in docs.** Use AWS Secrets Manager or SSM Parameter Store (SecureString).
- **Runtime**: Services resolve secrets at startup or on first use; rotate credentials without code change.
- **CI/CD**: Use IAM roles or short-lived credentials; no long-lived keys in repo or config files.

---

## Compliance

- **Data retention**: Define and document retention for PII and payment-related data; implement deletion or anonymization where required. To be refined.
- **PII handling**: Minimize collection and storage; document in privacy notice; allow access/deletion as required by jurisdiction.
- **Regional constraints**: If data must stay in a specific region, deploy Cognito, RDS, DynamoDB, and S3 in that region and document in ADR.
