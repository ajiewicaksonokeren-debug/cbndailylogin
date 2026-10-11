import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_LEVELS, DEFAULT_RULES as R } from './defaults.ts';
import { addDays, calcDay, dayKey, eventBonus, levelIndex, nextReset, parseWib, type EventLite } from './points.ts';

test('day key follows WIB reset, not UTC', () => {
  assert.equal(dayKey(parseWib('2026-10-10 23:59:59'), '00:00:00'), '2026-10-10');
  assert.equal(dayKey(parseWib('2026-10-11 00:00:00'), '00:00:00'), '2026-10-11');
  assert.equal(dayKey(parseWib('2026-10-11 03:59:59'), '04:00:00'), '2026-10-10');
  assert.equal(nextReset(parseWib('2026-10-10 14:00:00'), '00:00:00'), parseWib('2026-10-11 00:00:00'));
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('design examples: H13 Basic = 12, H14 = 15+50+200', () => {
  assert.deepEqual(calcDay(R, 0, 13), { m: 1.2, base: 12, lb: 0, cyc: 0, ms: 0, total: 12 });
  assert.equal(calcDay(R, 0, 14).total, 15 + 50 + 200);
  assert.equal(calcDay(R, 5, 13).lb, 1); // Silver +5% of 12 → 0.6 → 1
  assert.equal(calcDay(R, 0, 30).total, 20 + 500); // 30 is not a multiple of 7
});

test('levels from lifetime points', () => {
  assert.equal(DEFAULT_LEVELS[levelIndex(DEFAULT_LEVELS, 999)].name, 'Basic');
  assert.equal(DEFAULT_LEVELS[levelIndex(DEFAULT_LEVELS, 5000)].name, 'Gold');
});

test('event bonus: multiplier excludes cycle/milestone; window is second-exact', () => {
  const base = { id: 'e', name: 'x', segments: [], start: parseWib('2026-10-10 00:00:00'), end: parseWib('2026-10-11 23:59:59') };
  const dbl: EventLite = { ...base, type: 'multiplier', value: 2 };
  const eb: EventLite = { ...base, type: 'time_window', value: 20, windowFrom: '05:00:00', windowTo: '09:00:00' };
  const c = calcDay(R, 0, 14);
  assert.equal(eventBonus(dbl, c, parseWib('2026-10-10 10:00:00')), 15);
  assert.equal(eventBonus(dbl, c, parseWib('2026-10-12 00:00:00')), 0);
  assert.equal(eventBonus(eb, c, parseWib('2026-10-10 08:59:59')), 20);
  assert.equal(eventBonus(eb, c, parseWib('2026-10-10 09:00:00')), 0);
});
