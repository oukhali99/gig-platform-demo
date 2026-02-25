# Gig platform infrastructure (Terraform)

Deploys: Cognito user pool; identity Lambda (auth + GET /users/:id); jobs Lambda + DynamoDB; bookings Lambda + DynamoDB; API Gateway (auth, jobs, bookings routes, JWT authorizer).

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured (credentials / profile)
- Node.js >= 20 (for building Lambdas)

## Deploy

From repo root:

```bash
# Deploy production (default: minimal logging)
yarn deploy
```

```bash
# Deploy dev (increased Lambda logging: request/response and errors in CloudWatch)
yarn deploy:dev
```

Dev sets `environment=dev` so Lambdas log each request (method, path, requestId, correlationId/sub where relevant) and response statusCode. Use for debugging; switch back to `yarn deploy` for production.

Or manually: `yarn workspace jobs-service build:lambda && yarn workspace identity-service build:lambda && yarn workspace bookings-service build:lambda`, then `cd infra && terraform init && terraform apply`. Add `-var=environment=dev` for dev logging.

## Outputs

- `api_url` — Base URL for the API (auth, jobs, bookings)
- `jobs_table_name` — Jobs DynamoDB table name
- `cognito_user_pool_id` — Cognito user pool ID
- `cognito_client_id` — Cognito app client ID

## API routes

**Identity / auth**

- `POST /auth/register` — Register (email, password)
- `POST /auth/login` — Login; returns tokens
- `POST /auth/refresh` — Refresh token
- `GET /auth/me` — Current user (sub, email); requires JWT
- `GET /users/{id}` — Get user by id (sub); returns sub, email; requires JWT

**Jobs**

- `GET /jobs` — List jobs (query: status, category, location, limit, cursor)
- `POST /jobs` — Create job
- `GET /jobs/{id}` — Get job
- `PUT /jobs/{id}` — Update job
- `POST /jobs/{id}/publish` — Publish draft job

**Bookings**

- `POST /bookings` — Create booking (body: jobId; **Idempotency-Key** header required)
- `GET /bookings/{id}` — Get booking
- `GET /bookings` — List bookings (query: jobId, workerId, status, limit, cursor)
- `POST /bookings/{id}/confirm` — Confirm booking (client)
- `POST /bookings/{id}/complete` — Mark completed
- `POST /bookings/{id}/cancel` — Cancel booking
