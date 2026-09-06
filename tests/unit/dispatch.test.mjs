import test from 'node:test';
import assert from 'node:assert/strict';

function normalizeDispatchFlow(value) {
  const flow = String(value || '').trim().toLowerCase();
  if (['immediate', 'start', 'at_start', 'early'].includes(flow)) return 'early';
  if (flow === 'on_ready') return 'on_ready';
  if (flow === 'pre_ready') return 'pre_ready';
  return 'pre_ready';
}

function commission({ base, includedKm, extraPerKm, distanceKm }) {
  return base + Math.max(0, Math.ceil(distanceKm - includedKm)) * extraPerKm;
}

test('dispatch settings normalize to supported flows', () => {
  assert.equal(normalizeDispatchFlow('early'), 'early');
  assert.equal(normalizeDispatchFlow('immediate'), 'early');
  assert.equal(normalizeDispatchFlow('pre_ready'), 'pre_ready');
  assert.equal(normalizeDispatchFlow('on_ready'), 'on_ready');
  assert.equal(normalizeDispatchFlow('unknown'), 'pre_ready');
});

test('driver commission charges only distance beyond included kilometres', () => {
  assert.equal(commission({ base: 30, includedKm: 2, extraPerKm: 5, distanceKm: 2 }), 30);
  assert.equal(commission({ base: 30, includedKm: 2, extraPerKm: 5, distanceKm: 2.1 }), 35);
  assert.equal(commission({ base: 30, includedKm: 2, extraPerKm: 5, distanceKm: 4.2 }), 45);
});
