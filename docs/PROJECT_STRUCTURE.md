# Waselni — Project Structure

The current repository intentionally keeps the Expo application and Node/PostgreSQL backend together so the existing product can evolve without a disruptive rewrite.

```text
app/                  Expo Router screens, grouped by customer/admin/driver/restaurant
components/           Shared UI components
lib/                  Client-side API, auth, location, notifications and utilities
server/               Express API, route modules, migrations and background jobs
tests/unit/            Fast deterministic regression tests
tests/e2e/             Staging/local HTTP flow tests
docs/                 Product/engineering runbooks
.github/workflows/     CI automation
```

## Backend boundaries

- `server/routes/` contains HTTP endpoints grouped by business capability.
- `server/migrate_*.js` contains idempotent database migrations used during startup/deployment.
- Order lifecycle authority is `server/routes/order_workflow.js`; the older duplicate driver-dispatch router is not mounted.
- Order-item availability/replacement lives in `server/routes/order_item_adjustments.js`.
- Customer order editing lives in `server/routes/customer_order_edits.js`.
- Ratings live in `server/routes/ratings.js`.

## Rules for future changes

1. Keep business logic close to its owning capability; avoid adding new duplicate `/api/orders` handlers for the same state transition.
2. Any order-state change must be checked against the database transition rules and represented in the flow tests.
3. Any money-changing operation must preserve rounding and payment allocation and have a regression test.
4. New scheduled/background work must use the existing job/lock pattern so multiple Railway instances cannot process the same job concurrently.
5. Keep secrets in Railway/environment variables; never commit credentials or production database URLs.
6. New customer-visible flows should have an API test before UI-only work is considered complete.

## Future app split

The eventual production split can be made without changing the backend contract:

- Waselni Customer App
- Waselni Driver App
- Waselni Restaurant App
- Admin Dashboard

Until that split is justified by release/scale needs, keep shared backend contracts stable and avoid duplicating server logic.
