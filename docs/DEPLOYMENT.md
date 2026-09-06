# Deployment checklist

## Required environment variables
- `DATABASE_URL`
- `JWT_SECRET` (at least 32 characters in production)
- `ALLOWED_ORIGINS` (comma-separated web origins in production)
- `PORT`
- `EXPO_PUBLIC_API_URL` in the mobile application build

Optional:
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`

## Before deploying
1. Install dependencies.
2. Run `npm run format:check`.
3. Run `npm run lint`.
4. Run `npm run typecheck`.
5. Run `npm test`.
6. Start the API once and confirm database migrations complete.
7. Call `/health`. Production is ready only when it returns HTTP 200 and `status: "ready"`.

## Health endpoints
- `/health/live` — process liveness, no database dependency.
- `/health` — database connectivity and required core schema readiness.

## Railway
Use:

```
npm run server
```

Do not expose secrets in the mobile application. The app may contain only public runtime configuration such as the API base URL.
