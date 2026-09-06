# Waselni — Flow Testing

## Test layers

- `npm test` — unit/regression tests; safe to run locally and in CI.
- `npm run test:e2e` — real HTTP flow tests against a dedicated staging/local environment only.
- `npm run lint` — static code-quality checks.
- `npm run format:check` — formatting consistency.
- CI runs the regression suite plus TypeScript and server syntax checks.

## E2E safety

`tests/e2e/flow-smoke.test.mjs` refuses to run the configured flow suite unless `E2E_BASE_URL` looks like a local or staging target (`localhost`, `127.0.0.1`, or a URL containing `staging`). Do not point E2E credentials at production.

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

## Automated critical flow

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

## Release-gate scenarios

These are intentionally separated from the smoke test because they require disposable test data, timed/background execution, payment-provider simulation, device permissions, or multiple actors:

### Order lifecycle
- Restaurant approval path instead of admin-first approval.
- Customer edit blocked after `ready`.
- Item unavailable → customer remove.
- Item unavailable → replacement selection.
- Unresolved item blocks restaurant `ready`.
- Multi-restaurant checkout creates one order per restaurant.
- Adding a restaurant after checkout creates a new order and redistributes delivery fee.
- Cancelled orders cannot be edited or claimed.

### Payments / money
- Cash checkout and final cash due.
- Wallet payment and insufficient balance.
- Vodafone Cash / InstaPay receipt is required.
- Payment proof pending → admin verify/reject.
- Split payment allocation and invalid totals.
- Paid order becomes cheaper after an item edit → payment adjustment is created once.
- Payment adjustment → wallet settlement and external settlement.
- Cancelled paid order → refund adjustment without double credit.

### Driver dispatch
- `early`: request starts with preparation.
- `pre_ready`: request starts at configured lead time.
- `on_ready`: request starts only when restaurant marks ready.
- Driver acceptance deadline expires and the order becomes eligible for retry.
- No available driver triggers a throttled customer/admin notification and keeps searching.
- A driver cannot claim two active deliveries.
- Dispatch setting changes do not rewrite an existing order's estimated preparation time.

### Delivery proof
- Prepaid electronic order cannot be delivered without proof.
- Valid delivery PIN succeeds; wrong PIN is rejected and attempts are limited.
- Delivery photo accepts supported image types within the size limit.
- Cash order can complete through the cash delivery path.

### GPS / notifications
- Foreground GPS updates while app is open.
- Background GPS updates on a development/release build, not Expo Go.
- GPS permission denial fails safely.
- Temporary network failure does not crash the location task.
- Customer, restaurant, driver, staff and admin receive the relevant order events.

## Test data policy

Use disposable staging users, restaurants, menu items, payment proofs, and delivery addresses. E2E creates real orders and should never be executed against production.
