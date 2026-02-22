# Gig platform — documentation index

Pre-build documentation for the gig platform: a decoupled, AWS microservices-based app for hiring people for small jobs (e.g. landscaping). Use these docs as the source of truth for boundaries, contracts, and decisions before and during implementation.

---

## Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [01-product-and-domain.md](01-product-and-domain.md) | Problem, goals, user personas, core flows, bounded contexts. |
| 02 | [02-architecture-overview.md](02-architecture-overview.md) | High-level architecture, decoupling strategy, AWS services, deployment. |
| 03 | [03-service-catalog.md](03-service-catalog.md) | Service catalog and boundaries: ownership, inbound/outbound, storage. |
| 04 | [04-api-contracts.md](04-api-contracts.md) | API list by service, auth, idempotency. |
| 05 | [05-event-contracts.md](05-event-contracts.md) | Event envelope, event types, consumers, idempotent handling. |
| 06 | [06-data-and-persistence.md](06-data-and-persistence.md) | Per-service data ownership, identifiers, sensitive data. |
| 07 | [07-security-and-compliance.md](07-security-and-compliance.md) | Authentication, authorization, network, secrets, compliance. |
| 08 | [08-operations-and-observability.md](08-operations-and-observability.md) | Logging, metrics, tracing, alerts, runbooks, DR. |
| — | [adr/](adr/) | Architecture decision records (template + ADR-001 to ADR-004). |

---

## Glossary

| Term | Definition |
|------|-------------|
| **Booking** | A confirmed or in-progress assignment of a worker to a job; has a status lifecycle (e.g. requested, confirmed, in progress, completed, cancelled). |
| **Bounded context** | A domain boundary that maps to one or more services; has a clear ownership of data and behavior (e.g. Jobs, Bookings, Payments). |
| **Client** | User persona who posts jobs and hires workers (job poster). |
| **Event** | A domain event published to the event bus (e.g. JobCreated, BookingConfirmed); used for async integration between services. |
| **Job** | A unit of work posted by a client (e.g. landscaping); has category, location, budget, schedule. |
| **Worker** | User persona who performs gigs; has profile, skills, availability, and receives payment. |
| **Idempotency** | Processing the same request or event more than once yields the same result; required for safe retries and event replay. |
| **Producer / Consumer** | Producer: service that publishes an event; Consumer: service that subscribes and handles the event. |
