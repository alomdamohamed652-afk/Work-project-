import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = String(process.env.E2E_BASE_URL || '').replace(/\/$/, '');
const customerPhone = process.env.E2E_CUSTOMER_PHONE;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD;
const adminPhone = process.env.E2E_ADMIN_PHONE;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const restaurantPhone = process.env.E2E_RESTAURANT_PHONE;
const restaurantPassword = process.env.E2E_RESTAURANT_PASSWORD;
const driverPhone = process.env.E2E_DRIVER_PHONE;
const driverPassword = process.env.E2E_DRIVER_PASSWORD;
const menuItemId = process.env.E2E_MENU_ITEM_ID;
const restaurantId = process.env.E2E_RESTAURANT_ID;

const safeTarget = /localhost|127\.0\.0\.1|staging/i.test(baseUrl);
const configured =
  safeTarget &&
  customerPhone &&
  customerPassword &&
  adminPhone &&
  adminPassword &&
  restaurantPhone &&
  restaurantPassword &&
  driverPhone &&
  driverPassword &&
  menuItemId &&
  restaurantId;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { response, body };
}

async function login(identifier, password) {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  assert.equal(response.status, 200, `login failed: ${JSON.stringify(body)}`);
  assert.ok(body.token);
  return body;
}

const auth = (token) => ({ authorization: `Bearer ${token}` });

test('staging health endpoint', { skip: !safeTarget }, async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.ok(body);
});

test('authentication and protected role boundary', { skip: !configured }, async () => {
  const customer = await login(customerPhone, customerPassword);
  const unauthorized = await request('/api/customer/wallet');
  assert.equal(unauthorized.response.status, 401);

  const admin = await login(adminPhone, adminPassword);
  const customerAsAdmin = await request('/api/customer/wallet', {
    headers: auth(admin.token),
  });
  assert.equal(customerAsAdmin.response.status, 403);

  const me = await request('/api/auth/me', { headers: auth(customer.token) });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.user.id, customer.user.id);
});

test('customer -> admin -> restaurant -> driver -> delivery -> rating', { skip: !configured }, async () => {
  const customer = await login(customerPhone, customerPassword);
  const admin = await login(adminPhone, adminPassword);
  const restaurant = await login(restaurantPhone, restaurantPassword);
  const driver = await login(driverPhone, driverPassword);

  const checkout = await request('/api/checkout/bulk', {
    method: 'POST',
    headers: auth(customer.token),
    body: JSON.stringify({
      idempotencyKey: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      deliveryAddress: 'E2E Test Address',
      orders: [{ restaurantId, items: [{ menuItemId, quantity: 1 }] }],
      paymentMethod: 'cash',
    }),
  });
  assert.equal(checkout.response.status, 201, JSON.stringify(checkout.body));
  const orderId = checkout.body.orders?.[0]?.id;
  const itemId = checkout.body.orders?.[0]?.items?.[0]?.id;
  assert.ok(orderId);
  assert.ok(itemId);

  const adminDecision = await request(`/api/orders/${orderId}/admin-decision`, {
    method: 'PATCH',
    headers: auth(admin.token),
    body: JSON.stringify({ approve: true }),
  });
  assert.equal(adminDecision.response.status, 200, JSON.stringify(adminDecision.body));
  assert.equal(adminDecision.body.order.status, 'preparing');

  const quantityEdit = await request(`/api/customer/orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    headers: auth(customer.token),
    body: JSON.stringify({ quantity: 2 }),
  });
  assert.equal(quantityEdit.response.status, 200, JSON.stringify(quantityEdit.body));
  assert.equal(Number(quantityEdit.body.order.subtotal) > 0, true);

  const restaurantReady = await request(`/api/orders/${orderId}/restaurant-status`, {
    method: 'PATCH',
    headers: auth(restaurant.token),
    body: JSON.stringify({ status: 'ready' }),
  });
  assert.equal(restaurantReady.response.status, 200, JSON.stringify(restaurantReady.body));
  assert.equal(restaurantReady.body.order.status, 'ready');

  const available = await request('/api/orders/driver/available', {
    headers: auth(driver.token),
  });
  assert.equal(available.response.status, 200, JSON.stringify(available.body));
  assert.ok(available.body.orders.some((order) => order.id === orderId));

  const claim = await request(`/api/orders/${orderId}/claim`, {
    method: 'PATCH',
    headers: auth(driver.token),
    body: JSON.stringify({}),
  });
  assert.equal(claim.response.status, 200, JSON.stringify(claim.body));
  assert.equal(claim.body.order.status, 'assigned');

  const pickedUp = await request(`/api/orders/${orderId}/driver-status`, {
    method: 'PATCH',
    headers: auth(driver.token),
    body: JSON.stringify({ status: 'assigned' }),
  });
  assert.equal(pickedUp.response.status, 200, JSON.stringify(pickedUp.body));
  assert.equal(pickedUp.body.order.status, 'picked_up');

  const onTheWay = await request(`/api/orders/${orderId}/driver-status`, {
    method: 'PATCH',
    headers: auth(driver.token),
    body: JSON.stringify({ status: 'picked_up' }),
  });
  assert.equal(onTheWay.response.status, 200, JSON.stringify(onTheWay.body));
  assert.equal(onTheWay.body.order.status, 'on_the_way');

  const delivered = await request(`/api/orders/${orderId}/driver-status`, {
    method: 'PATCH',
    headers: auth(driver.token),
    body: JSON.stringify({ status: 'on_the_way' }),
  });
  assert.equal(delivered.response.status, 200, JSON.stringify(delivered.body));
  assert.equal(delivered.body.order.status, 'delivered');

  const rating = await request(`/api/ratings/order/${orderId}`, {
    method: 'POST',
    headers: auth(customer.token),
    body: JSON.stringify({
      restaurantRating: 5,
      driverRating: 5,
      restaurantComment: 'E2E rating',
      driverComment: 'E2E rating',
    }),
  });
  assert.equal(rating.response.status, 201, JSON.stringify(rating.body));
  assert.equal(Number(rating.body.rating.restaurant_rating), 5);
  assert.equal(Number(rating.body.rating.driver_rating), 5);

  const duplicateRating = await request(`/api/ratings/order/${orderId}`, {
    method: 'POST',
    headers: auth(customer.token),
    body: JSON.stringify({ restaurantRating: 4 }),
  });
  assert.equal(duplicateRating.response.status, 409);
});
