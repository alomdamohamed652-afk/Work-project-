import test from 'node:test';
import assert from 'node:assert/strict';

function normalizePhone(value) {
  return String(value || '').replace(/[\s-]/g, '');
}

function isStrongSecret(value) {
  return typeof value === 'string' && value.length >= 32;
}

test('phone normalization removes spaces and dashes', () => {
  assert.equal(normalizePhone('010-123 45678'), '01012345678');
});

test('production JWT secret must be strong', () => {
  assert.equal(isStrongSecret('a'.repeat(31)), false);
  assert.equal(isStrongSecret('a'.repeat(32)), true);
});
