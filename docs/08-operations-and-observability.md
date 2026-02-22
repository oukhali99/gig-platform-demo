# Operations and observability

## Logging

- **Format**: Structured logs (JSON); include timestamp, level, service name, correlation ID, and message.
- **Levels**: Use consistently (e.g. ERROR for failures, WARN for retries, INFO for key actions, DEBUG for development).
- **PII**: Do not log passwords, tokens, or full PII; redact or omit where required.
- **Destination**: CloudWatch Logs; one log group per service or per function, with retention policy.

---

## Metrics

- **Per service**: Request count, latency (p50, p95, p99), error rate (4xx, 5xx).
- **Business**: Booking creation rate, payment success/failure count, event publish/delivery failures.
- **Source**: API Gateway metrics, Lambda metrics, custom metrics from application (CloudWatch PutMetricData).
- **Dashboards**: One dashboard per service or one platform dashboard; define in IaC where possible.

---

## Tracing

- **Tool**: AWS X-Ray when adopted; document which components are instrumented (API Gateway, Lambda, ECS).
- **Correlation**: Pass correlation ID (or X-Ray trace ID) across API and event boundaries for request tracing.

---

## Alerts

- **API**: 5xx rate above threshold; API latency above threshold.
- **Payments**: Failed payment rate; payment service errors.
- **Events**: EventBridge dead-letter queue (or failed invocations) count above threshold.
- **Infra**: Lambda errors, throttles; RDS/DynamoDB throttles or connection errors.
- **Channels**: Email, SNS, or PagerDuty; define in IaC.

---

## Runbooks

Placeholder sections to be filled during implementation:

- **Incident response**: Who is on call; how to detect and triage; escalation path.
- **Rollback**: How to roll back a service (e.g. deploy previous version, revert IaC).
- **Event replay**: How to replay failed events from dead-letter queue after fix.
- **Database**: How to restore from snapshot (RDS/DynamoDB); point-in-time recovery.

---

## DR and availability

- **Target**: Define target availability (e.g. 99.9%); document in ADR if needed.
- **Backups**: RDS automated backups and snapshots; DynamoDB point-in-time recovery and backups.
- **Multi-AZ**: Use multi-AZ for RDS and DynamoDB where required for availability.
- **Region**: Single region for MVP unless compliance requires multi-region; document in 07-security-and-compliance.
