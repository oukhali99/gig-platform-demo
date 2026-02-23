# Gig platform infrastructure (Terraform)

Deploys: Cognito user pool, jobs Lambda + DynamoDB, identity Lambda, API Gateway (jobs + auth routes, JWT authorizer).

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured (credentials / profile)
- Node.js >= 20 (for building Lambdas)

## Deploy

From repo root:

```bash
# Deploy (builds both Lambda packages, then terraform apply)
yarn deploy
```

Or manually: `yarn workspace jobs-service build:lambda && yarn workspace identity-service build:lambda`, then `cd infra && terraform init && terraform apply`. Run both Lambda builds before apply when service code changes.

## Outputs

- `api_url` — Base URL for the API (jobs + auth)
- `jobs_table_name` — DynamoDB table name
- `cognito_user_pool_id` — Cognito user pool ID
- `cognito_client_id` — Cognito app client ID

## API routes

- `GET /jobs` — List jobs (query: status, category, location, limit, cursor)
- `POST /jobs` — Create job
- `GET /jobs/{id}` — Get job
- `PUT /jobs/{id}` — Update job
- `POST /jobs/{id}/publish` — Publish draft job
