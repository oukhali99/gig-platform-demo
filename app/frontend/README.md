# Frontend

React app for the gig platform: register/login (Cognito via identity API), then list jobs, create job, view and publish.

## Setup

```bash
yarn install
cp .env.example .env
# Edit .env: set VITE_JOBS_API_URL to your API base URL (from `terraform output api_url`).
```

## Run

```bash
yarn dev
```

Open http://localhost:5173. Register or log in; then list jobs, post a job (draft), open the job and click “Publish job” to publish. All job API calls require a valid JWT (sent automatically after login).

## Build

```bash
yarn build
```

Output in `dist/`. Serve with any static host; ensure `VITE_JOBS_API_URL` is set at build time so the app can call the API.
