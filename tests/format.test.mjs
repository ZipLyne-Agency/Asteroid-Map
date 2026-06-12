import assert from 'node:assert/strict';
import test from 'node:test';

import { formatBig, formatRange, formatRecurrence } from '../lib/format.ts';

test('formatBig preserves thousands without rounding to a misleading bucket', () => {
  assert.equal(formatBig(1499), '1,499');
  assert.equal(formatBig(1501), '1,501');
  assert.equal(formatBig(999_499), '999,499');
});

test('formatBig handles million and billion boundaries cleanly', () => {
  assert.equal(formatBig(1_500_000), '1.5 million');
  assert.equal(formatBig(999_500_000), '1 billion');
  assert.equal(formatBig(8_200_000_000), '8.2 billion');
});

test('formatRange and recurrence use the same bounded number formatting', () => {
  assert.equal(formatRange(1499, 1501), '1,499-1,501');
  assert.equal(formatRange(999_499, 999_500), '999,499-999,500');
  assert.equal(formatRecurrence(20_000), '~every 20,000 years');
});
