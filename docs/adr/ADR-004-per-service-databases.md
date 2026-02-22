# ADR-004: Per-service databases (no shared DB)

**Status**: Accepted  
**Date**: 2025-02-22

## Context

Microservices need to own their data to allow independent deployment and technology choices. A shared database would create coupling and make it hard to change one service without affecting others.

## Decision

**Each service has its own database(s).** No service connects to another service’s database. No shared schema or shared DB instance across bounded contexts.

- **Data access**: A service only reads/writes its own store (DynamoDB, RDS, or both per service as needed).
- **Cross-service data**: Obtained by calling another service’s API or by reacting to its events and storing a minimal copy (e.g. IDs and denormalized fields) only when necessary for local processing.
- **References**: Use logical IDs (e.g. jobId, workerId) in events and APIs; no foreign keys across service boundaries.

## Consequences

- **Positive**: Clear ownership; independent schema evolution and scaling; failure isolation; technology choice per service (e.g. DynamoDB vs RDS).
- **Negative**: No ACID across services; eventual consistency where events are used; need to design for duplicate events and idempotency.
- **Neutral**: Team must follow docs/06-data-and-persistence and avoid “just one query” into another service’s DB.
