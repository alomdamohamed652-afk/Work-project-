import test from 'node:test';
import assert from 'node:assert/strict';

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function checkoutTotal({ subtotal, deliveryFee, discount = 0, adminFee = 0 }) {
  return money(Math.max(0, subtotal + deliveryFee + adminFee - discount));
}

function splitDeliveryFee(totalFee, restaurantCount) {
  if (restaurantCount <= 0) return [];
  return Array.from({ length: restaurantCount }, (_, index) =>
    index === 0 ? money(totalFee) : 0
  );
}

test('checkout total never becomes negative', () => {
  assert.equal(checkoutTotal({ subtotal: 100, deliveryFee: 20, discount: 10 }), 110);
  assert.equal(checkoutTotal({ subtotal: 20, deliveryFee: 5, discount: 100 }), 0);
});

test('multi-restaurant delivery fee is represented once before redistribution', () => {
  assert.deepEqual(splitDeliveryFee(35, 3), [35, 0, 0]);
});

test('money calculations are rounded to two decimals', () => {
  assert.equal(money(10.005), 10.01);
});
