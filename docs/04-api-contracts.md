# API contracts

APIs are exposed via API Gateway. Full OpenAPI/Smithy specs can be added later in code; this document is the contract-first baseline.

---

## Authentication

- **Clients**: Authenticate with **Cognito JWT** (ID token or access token) in `Authorization: Bearer <token>`.
- **Internal service-to-service**: If needed, use IAM or API keys; prefer events to reduce coupling. Document in ADR if used.

---

## API list by service

### Identity

| Method | Path (example) | Purpose |
|--------|----------------|---------|
| POST   | /auth/register | Register (client or worker); body: email, password, role. |
| POST   | /auth/login    | Login; returns tokens. |
| POST   | /auth/refresh  | Refresh access token. |
| GET    | /auth/me       | Current user and role. |

### Jobs

| Method | Path (example) | Purpose |
|--------|----------------|---------|
| POST   | /jobs          | Create job; body: title, categoryId, location, description, budget, scheduledAt. |
| PUT    | /jobs/:id      | Update job (owner only). |
| GET    | /jobs/:id      | Get job by ID. |
| GET    | /jobs          | List jobs (query: status, category, location, limit, cursor). |
| POST   | /jobs/:id/publish | Publish draft job. |

**Ids**: `id` is UUID.

### Workers

| Method | Path (example) | Purpose |
|--------|----------------|---------|
| GET    | /workers/me    | Current user's worker profile. |
| PUT    | /workers/me    | Create/update worker profile; body: displayName, skills, availability. |
| GET    | /workers/:id   | Get worker by ID (public profile). |
| GET    | /workers       | List workers (query: skills, location, limit, cursor). |

**Ids**: `id` is UUID.

### Bookings

| Method | Path (example) | Purpose |
|--------|----------------|---------|
| POST   | /bookings      | Create booking; body: jobId, workerId; **idempotency key required**. |
| GET    | /bookings/:id  | Get booking by ID. |
| GET    | /bookings      | List bookings (query: jobId, workerId, status, limit, cursor). |
| POST   | /bookings/:id/confirm | Confirm booking (client). |
| POST   | /bookings/:id/complete | Mark completed (client or worker). |
| POST   | /bookings/:id/cancel  | Cancel booking. |

**Ids**: `id` is UUID. **Idempotency**: `Idempotency-Key` header required for POST /bookings.

### Payments

| Method | Path (example) | Purpose |
|--------|----------------|---------|
| POST   | /payments/hold | Create hold for booking; body: bookingId, amount; **idempotency key required**. |
| POST   | /payments/:id/release | Release payment (e.g. on booking completed). |
| POST   | /payments/:id/refund | Refund (full or partial). |
| GET    | /payments/:id  | Get payment status. |

**Ids**: `id` is UUID. **Idempotency**: `Idempotency-Key` header required for POST /payments/hold.

### Reviews (if implemented)

| Method | Path (example) | Purpose |
|--------|----------------|---------|
| POST   | /reviews      | Submit review; body: bookingId, rating, text. |
| GET    | /reviews      | List reviews (query: workerId, limit, cursor). |

---

## Idempotency

| Operation | Idempotency key |
|-----------|------------------|
| POST /bookings | Required (`Idempotency-Key` header). |
| POST /payments/hold | Required (`Idempotency-Key` header). |

Key is an opaque string (e.g. UUID) supplied by the client; same key within a time window returns the same result without re-executing.

---

## Common response shapes

- **Success**: `200`/`201` with JSON body (resource or list with `items`, `nextCursor`).
- **Validation error**: `400` with `{ "errors": [{ "field", "message" }] }`.
- **Not found**: `404` with `{ "code": "NOT_FOUND", "message": "..." }`.
- **Forbidden**: `403` with `{ "code": "FORBIDDEN", "message": "..." }`.
- **Conflict**: `409` for duplicate idempotency key or business rule violation.
