# Waselni — Local Delivery Platform

منصة توصيل محلية مبنية بـ Expo/React Native + Node.js/Express + PostgreSQL، وتدعم أدوار العميل والمندوب والمطعم والإدارة.

## Repository map

```text
app/                    Expo Router screens by role
components/             shared UI
lib/                    client API/auth/location/notifications/utilities
server/routes/          HTTP APIs grouped by capability
server/migrate_*.js     idempotent database migrations
server/                  startup, jobs, database and backend modules
tests/unit/              deterministic regression tests
tests/e2e/               local/staging HTTP flow tests
docs/                    engineering and release runbooks
.github/workflows/       CI
```

## Core order ownership

- `server/routes/order_workflow.js` is the authority for order lifecycle and driver dispatch transitions.
- `server/routes/order_item_adjustments.js` owns unavailable/replacement item handling.
- `server/routes/customer_order_edits.js` owns customer edits while an order is editable.
- `server/routes/payment_adjustments.js` owns post-payment balance adjustments.
- `server/routes/ratings.js` owns post-delivery ratings.

Do not add a duplicate state transition under another `/api/orders` router.

## Development

See `docs/DEVELOPMENT.md` for the local workflow, database safety, CI rules and release expectations.

See `docs/TESTING.md` for the automated smoke flow and release-gate scenarios.

## Environment

Copy `.env.example` for local configuration. Real credentials and production database URLs belong only in the deployment environment and must never be committed.

## Architecture direction

The current repository intentionally keeps the Expo app and backend together. The eventual production split can be made into Customer App, Driver App, Restaurant App and Admin Dashboard without changing the backend contract.
