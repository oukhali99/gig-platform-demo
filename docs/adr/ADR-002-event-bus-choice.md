# ADR-002: Event bus — EventBridge

**Status**: Accepted  
**Date**: 2025-02-22

## Context

We need a managed event bus for domain events so services can publish and subscribe without tight coupling. Options include AWS EventBridge, SNS/SQS, or a third-party broker.

## Decision

Use **Amazon EventBridge** as the default event bus for domain events.

- **Rationale**: EventBridge provides schema registry, filtering, and routing; integrates with Lambda and other AWS services; supports at-least-once delivery and dead-letter queues. No brokers to operate. Good fit for event-driven microservices on AWS.
- **Fallback**: If we need stronger ordering or exactly-once semantics for a specific flow, we may introduce SQS (FIFO) for that flow only; document in a follow-up ADR.

## Consequences

- **Positive**: Managed, scalable; rich filtering and multiple targets; no server management.
- **Negative**: At-least-once delivery only; consumers must be idempotent. Event size and throughput limits apply.
- **Neutral**: We standardize on the event envelope (eventId, eventType, eventVersion, correlationId, timestamp, producer, payload) in docs/05-event-contracts.md.
