# Gig Platform

A **serverless**, **event-driven** gig marketplace: clients post small jobs (e.g. landscaping, handyman), workers discover and complete them. Built on AWS with **decoupled microservices**, **no shared databases**, and **managed services** for high availability and scale.

---

## Why this stack

- **Serverless** — No servers to patch or scale by hand. Lambda and API Gateway scale with traffic; you pay for what you use.
- **Highly available** — AWS manages availability for Lambda, DynamoDB, API Gateway, Cognito, and EventBridge; multi-AZ and automatic failover where applicable.
- **Scalable** — Each service scales independently. Lambda concurrency and DynamoDB throughput can grow with load without redesign.
- **Decoupled microservices** — Clear service boundaries (Identity, Jobs, …). Services own their data and integrate via **APIs** and **domain events**, not shared tables.
- **Event-driven** — Domain events (e.g. job created, job published) flow over EventBridge so services stay loosely coupled and new consumers can be added without changing producers.

---

## AWS services used

| Service | Use |
|--------|-----|
| **API Gateway** (HTTP API) | Single API surface for auth, jobs, and bookings; JWT authorizer (Cognito). |
| **Lambda** | Identity (register, login, refresh, me, get user by id), Jobs (CRUD, publish), Bookings (create, confirm, complete, cancel). |
| **Cognito** (User Pools) | User identity, email sign-in, JWT tokens. |
| **DynamoDB** | Jobs table and Bookings table (per-service; no shared database). |
| **EventBridge** | Domain event bus (e.g. job.created, job.published, booking.created) for async integration. |
| **IAM** | Least-privilege roles per Lambda (Cognito, DynamoDB, EventBridge). |
| **CloudWatch** | Logs and metrics for Lambdas and API Gateway. |

Infrastructure is defined in **Terraform** (single codebase, no manual console wiring).

---

## Architecture at a glance

- **Microservices**: Identity, Jobs, and Bookings are implemented as separate deployable units with their own Lambda and data (Cognito for identity; DynamoDB for jobs and bookings). Payments and Notifications are designed in docs and can be added the same way.
- **Contract-first**: API and event contracts are documented before implementation ([docs/04-api-contracts.md](docs/04-api-contracts.md), [docs/05-event-contracts.md](docs/05-event-contracts.md)).
- **Per-service data**: Each service owns its store; cross-service data only via APIs or events (no shared DB).
- **Event-driven integration**: Jobs and Bookings publish events to EventBridge; consumers (e.g. notifications, analytics) can subscribe without changing producers.

See [docs/02-architecture-overview.md](docs/02-architecture-overview.md) and [docs/03-service-catalog.md](docs/03-service-catalog.md) for details and diagrams.

---

## Repo structure

```
├── app/
│   ├── frontend/          # React SPA (Vite) — login, register, jobs, bookings
│   └── services/
│       ├── identity/      # Identity Lambda — register, login, refresh, me, GET /users/:id (Cognito)
│       ├── jobs/          # Jobs Lambda + DynamoDB; publishes to EventBridge
│       └── bookings/      # Bookings Lambda + DynamoDB; create/confirm/complete/cancel
├── docs/                  # Product, architecture, API/event contracts, ADRs
├── infra/                 # Terraform — Cognito, Lambdas, API Gateway, DynamoDB
└── package.json           # Yarn workspaces; deploy script
```

---

## Where to look

- **Auth & user lookup**: `app/services/identity/src/index.ts`, `cognito.ts`
- **Jobs CRUD & publish**: `app/services/jobs/src/index.ts`, `repository.ts`
- **Bookings flow**: `app/services/bookings/src/index.ts`, [docs/04-api-contracts.md](docs/04-api-contracts.md) (Bookings + Idempotency)
- **API contracts**: [docs/04-api-contracts.md](docs/04-api-contracts.md), [docs/05-event-contracts.md](docs/05-event-contracts.md)

---

## Quick start

**Prerequisites**: Node.js 20+, Yarn, Terraform 1.0+, AWS CLI configured.

```bash
# Install
yarn install

# Deploy (builds Lambda packages, then Terraform apply)
yarn deploy
```

Then set the frontend API URL from `terraform output api_url` and run the frontend (see [app/frontend/README.md](app/frontend/README.md)).

**Destroy**:

```bash
yarn destroy
```

---

## Documentation

- [docs/README.md](docs/README.md) — Index and glossary
- [docs/01-product-and-domain.md](docs/01-product-and-domain.md) — Problem, personas, flows, bounded contexts
- [docs/02-architecture-overview.md](docs/02-architecture-overview.md) — High-level design and AWS services
- [docs/04-api-contracts.md](docs/04-api-contracts.md) — Auth, jobs, and bookings API
- [docs/05-event-contracts.md](docs/05-event-contracts.md) — Domain events
- [docs/adr/](docs/adr/) — Architecture decision records (microservices, EventBridge, Cognito, per-service DBs)

---

## Tech stack

- **Runtime**: Node.js 20 (Lambda)
- **Frontend**: React 18, TypeScript, Vite, React Router
- **Infra**: Terraform (AWS provider)
- **Package manager**: Yarn (workspaces)
