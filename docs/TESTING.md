# Waselni — Flow Testing

## Test layers

- `npm test` — unit/regression tests; safe to run locally and in CI.
- `npm run test:e2e` — real HTTP flow tests against a dedicated staging/local environment only.
- `npm run lint` — static code-quality checks.
- `npm run format:check` — formatting consistency.
- CI runs the regression suite plus TypeScript and server syntax checks.

## E2E safety

`tests/e2e/flow-smoke.test.mjs` intentionally refuses to run the configured flow suite unless `E2E_BASE_URL` looks like a local or staging target (`localhost`, `127.0.0.1`, or a URL containing `staging`). Do not point E2E credentials at production.

Required variables:

```text
E2E_BASE_URL
E2E_CUSTOMER_PHONE
E2E_CUSTOMER_PASSWORD
E2E_ADMIN_PHONE
E2E_ADMIN_PASSWORD
E2E_RESTAURANT_PHONE
E2E_RESTAURANT_PASSWORD
E2E_DRIVER_PHONE
E2E_DRIVER_PASSWORD
E2E_MENU_ITEM_ID
E2E_RESTAURANT_ID
```

## Critical flow currently covered

1. Health check.
2. Authentication + role boundary (`401`/`403`).
3. Customer checkout with cash.
4. Admin approval → `preparing`.
5. Customer quantity edit while order is editable.
6. Restaurant → `ready`.
7. Driver availability → claim → `assigned`.
8. Driver pickup → `picked_up` → `on_the_way`.
9. Cash delivery → `delivered`.
10. Customer restaurant/driver rating.
11. Duplicate rating rejection.

## Manual scenarios still required before release

- Restaurant approval path instead of admin-first approval.
- Item unavailable → customer remove.
- Item unavailable → replacement selection.
- Multi-restaurant checkout and adding a restaurant after checkout creation.
- Wallet / Vodafone Cash / InstaPay / split payment proof and rejection.
- Payment adjustment/refund after a paid order becomes cheaper.
- Driver dispatch modes: early, pre-ready, and on-ready.
- Driver late/no-driver retry behavior.
- Delivery proof PIN/photo for prepaid orders.
- GPS background updates and reconnect behavior.
- Push notification delivery for customer, restaurant, driver, staff, and admin.

## Test data policy

Use disposable staging users, restaurants, menu items, and delivery addresses. E2E creates real orders and should never be executed against production.
