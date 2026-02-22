# Data and persistence

## Per-service data ownership

Each service owns and stores only its own data. There is **no cross-service database access**. To use data owned by another service, call its API or react to its events (and store only what you need for your own operations, e.g. denormalized IDs and minimal fields).

| Service        | Owns |
|----------------|------|
| Identity       | User identity, roles. |
| Jobs           | Jobs, categories. |
| Workers        | Worker profiles, skills, availability, aggregate ratings. |
| Bookings       | Bookings (with jobId, workerId, clientId as references). |
| Payments       | Payment records, holds, releases, refunds. |
| Notifications  | Delivery log, preferences (optional). |
| Reviews        | Reviews (with bookingId, workerId as references). |

---

## Identifiers

- Use **UUIDs** for all primary identifiers: jobId, workerId, bookingId, paymentId, userId (where stored in app DB), reviewId.
- Avoid auto-increment or sequential IDs that leak across services or make guessing easy.
- References between services are by ID only; no foreign keys across service boundaries.

---

## Event sourcing

- **Current stance**: Current state only; events are used for **integration** (notifying other services), not as the system of record for aggregate state.
- If event sourcing is adopted later (e.g. for payments/audit), document in an ADR and limit scope to the service(s) that need it.

---

## Sensitive data

- **PII**: Stored only in services that need it (e.g. identity, workers for display name). Minimize replication; use APIs to resolve when possible.
- **Financial**: Payments service and payment provider only. Card/bank details must not be stored in our DB; use provider tokens.
- **Encryption**: Enable encryption at rest (RDS encryption, DynamoDB encryption, S3 SSE) and use KMS where required. Encrypt sensitive fields in application layer if needed beyond provider defaults.
