# Jobs service infrastructure (Terraform)

Deploys the jobs service: DynamoDB table, Lambda, API Gateway HTTP API.

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured (credentials / profile)
- Node.js >= 20 (for building the Lambda)

## Deploy

From repo root:

```bash
# Deploy (builds Lambda package via jobs workspace, then terraform apply)
yarn deploy
```

Or manually: `yarn workspace jobs-service build:lambda`, then `cd infra && terraform init && terraform apply`. Run the Lambda build before apply when jobs code changes.

## Outputs

- `jobs_api_url` — Base URL for the Jobs API (e.g. `https://xxx.execute-api.region.amazonaws.com`)
- `jobs_table_name` — DynamoDB table name

## API routes

- `GET /jobs` — List jobs (query: status, category, location, limit, cursor)
- `POST /jobs` — Create job
- `GET /jobs/{id}` — Get job
- `PUT /jobs/{id}` — Update job
- `POST /jobs/{id}/publish` — Publish draft job
