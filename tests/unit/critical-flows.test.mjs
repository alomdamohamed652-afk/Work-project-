import test from 'node:test';
import assert from 'node:assert/strict';

const EDITABLE_ORDER_STATES = new Set(['restaurant_pending', 'preparing']);
const ACTIVE_ITEM_STATES = new Set(['available', 'replacement_selected']);
const UNRESOLVED_ITEM_STATES = new Set(['unavailable', 'replacement_pending']);

function canCustomerEdit(status) {
  return EDITABLE_ORDER_STATES.has(status);
}

function canMarkReady(orderStatus, itemStatuses) {
  return ['preparing', 'assigned'].includes(orderStatus) &&
    !itemStatuses.some((status) => UNRESOLVED_ITEM_STATES.has(status));
}

function nextUnavailableDecision(status, decision) {
  if (!UNRESOLVED_ITEM_STATES.has(status)) return null;
  return decision === 'remove' ? 'removed' : decision === 'replace' ? 'replacement_pending' : null;
}

function paymentValidation(method, total, payments = []) {
  const allowed = new Set(['cash', 'wallet', 'vodafone_cash', 'instapay']);
  if (method !== 'split') {
    if (!allowed.has(method)) return 'unsupported';
    if (['vodafone_cash', 'instapay'].includes(method) && !payments[0]?.receiptBase64) return 'receipt_required';
    return 'ok';
  }
  if (payments.length < 2) return 'split_required';
  const sum = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  if (Math.abs(sum - total) > 0.01) return 'split_total_mismatch';
  if (payments.some((p) => ['vodafone_cash', 'instapay'].includes(p.method) && !p.receiptBase64)) return 'receipt_required';
  return 'ok';
}

test('customer editing is locked once the order is ready', () => {
  assert.equal(canCustomerEdit('restaurant_pending'), true);
  assert.equal(canCustomerEdit('preparing'), true);
  assert.equal(canCustomerEdit('ready'), false);
  assert.equal(canCustomerEdit('assigned'), false);
});

test('restaurant cannot mark an order ready while an item is unresolved', () => {
  assert.equal(canMarkReady('preparing', ['available', 'replacement_selected']), true);
  assert.equal(canMarkReady('preparing', ['available', 'unavailable']), false);
  assert.equal(canMarkReady('preparing', ['replacement_pending']), false);
  assert.equal(canMarkReady('ready', ['available']), false);
});

test('unavailable item decisions stay inside the supported flow', () => {
  assert.equal(nextUnavailableDecision('unavailable', 'remove'), 'removed');
  assert.equal(nextUnavailableDecision('unavailable', 'replace'), 'replacement_pending');
  assert.equal(nextUnavailableDecision('available', 'remove'), null);
  assert.equal(nextUnavailableDecision('replacement_selected', 'replace'), null);
});

test('electronic payment requires transfer proof and split payments must balance', () => {
  assert.equal(paymentValidation('vodafone_cash', 100, [{}]), 'receipt_required');
  assert.equal(paymentValidation('instapay', 100, [{ receiptBase64: 'proof' }]), 'ok');
  assert.equal(paymentValidation('split', 100, [{ method: 'cash', amount: 60 }]), 'split_required');
  assert.equal(paymentValidation('split', 100, [
    { method: 'cash', amount: 60 },
    { method: 'instapay', amount: 40, receiptBase64: 'proof' },
  ]), 'ok');
  assert.equal(paymentValidation('split', 100, [
    { method: 'cash', amount: 60 },
    { method: 'instapay', amount: 30, receiptBase64: 'proof' },
  ]), 'split_total_mismatch');
});


function paymentStatus(total, paid) {
  const t = Math.max(0, Number(total || 0));
  const p = Math.max(0, Number(paid || 0));
  const cashDue = Math.max(0, t - p);
  if (t <= 0) return 'paid';
  if (p >= t - 0.01) return 'paid';
  if (p > 0) return 'partially_paid';
  if (cashDue > 0) return 'cash_due';
  return 'pending';
}

test('COD stays cash_due after order price adjustments', () => {
  assert.equal(paymentStatus(500, 0), 'cash_due');
  assert.equal(paymentStatus(350, 0), 'cash_due');
});

test('partial wallet payment stays partially_paid after adjustments', () => {
  assert.equal(paymentStatus(500, 100), 'partially_paid');
  assert.equal(paymentStatus(80, 100), 'paid');
});

test('fully paid order remains paid after adjustments', () => {
  assert.equal(paymentStatus(500, 500), 'paid');
  assert.equal(paymentStatus(400, 500), 'paid');
});


test('verified electronic payment plus cash remains partially paid, not paid', () => {
  assert.equal(paymentStatus(100, 60), 'partially_paid');
  assert.equal(paymentStatus(100, 0), 'cash_due');
});
