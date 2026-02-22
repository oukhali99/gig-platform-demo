# ADR-001: Microservices and event-driven integration

**Status**: Accepted  
**Date**: 2025-02-22

## Context

We need a system that can scale per domain, allow independent deployment, and avoid a single monolithic failure mode. The gig platform has clear bounded contexts (jobs, workers, bookings, payments, notifications) that map well to separate services.

## Decision

- Adopt a **microservices** style: one deployable unit per bounded context (or a small set of related contexts), each with its own data store.
- Use **event-driven** integration for cross-service communication where possible: services publish domain events (e.g. JobCreated, BookingConfirmed) and consume events from others. Use synchronous APIs for request/response when the client or orchestrator needs an immediate answer.
- Prefer **loose coupling**: services do not call each other in long chains; they react to events and expose APIs for what they own.

## Consequences

- **Positive**: Independent scaling and deployment; clearer ownership; failure isolation; ability to add new consumers of events without changing producers.
- **Negative**: Operational complexity (more deployables, event ordering and idempotency); distributed tracing and monitoring required.
- **Neutral**: Team must follow documented contracts (APIs and events) and avoid shared databases.
