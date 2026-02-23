# Frontend

Simple React app for the gig platform (jobs: list, create, view, publish).

## Setup

```bash
yarn install
cp .env.example .env
# Edit .env: set VITE_JOBS_API_URL to your Jobs API URL (from `terraform output jobs_api_url` or infra output).
```

## Run

```bash
yarn dev
```

Open http://localhost:5173. List shows published jobs; use “Post a job” to create (draft), then open the job and click “Publish job” to publish.

## Build

```bash
yarn build
```

Output in `dist/`. Serve with any static host; ensure `VITE_JOBS_API_URL` is set at build time so the app can call the API.
