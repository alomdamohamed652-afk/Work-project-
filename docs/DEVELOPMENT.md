# Waselni — Development Workflow

## Before changing code

1. Identify the owning capability in `server/routes/` or `app/`.
2. Do not add a second handler for an existing order state transition.
3. Check whether the change affects money, permissions, notifications, or order state. If yes, add a regression test.

## Local checks

```bash
npm install
npm test
npm run lint
npm run format:check
npx tsc --noEmit --pretty false
```

For the API:

```bash
npm run server
```

For the app:

```bash
npm start
```

## Database

Migrations are idempotent and are run as part of the deployment startup path. For a local database, use `npm run db:migrate:all` and then seed only disposable development data.

Never run destructive or seed commands against production unless the operation has been explicitly reviewed.

## E2E

Run `npm run test:e2e` only with disposable Local/Staging credentials. The E2E suite deliberately refuses production-looking targets.

## Git / CI

- Keep commits focused on one capability or maintenance task.
- Pushes and pull requests to `main` run the CI workflow.
- CI must pass tests, TypeScript, and server syntax checks before release work continues.
- Never commit `.env`, credentials, database URLs containing passwords, generated build output, or logs.

## Release rule

Do not treat a green unit/CI run as proof that real payment, push, GPS, background execution, or store builds work. Those require dedicated staging/device validation documented in `docs/TESTING.md`.
