import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeZonePopulationEstimate,
  encodeZonePopulationEstimate,
  urlWithZonePopulationEstimate,
} from '../lib/share-population.ts';

const estimate = {
  central: { crater: 1, fireball: 2, blast: 3, minorBlast: 4, thermal: 5 },
  low: { crater: 0.5, fireball: 1, blast: 1.5, minorBlast: 2, thermal: 2.5 },
  high: { crater: 2, fireball: 4, blast: 6, minorBlast: 8, thermal: 10 },
};

test('zone population estimates round-trip through shared URL payloads', () => {
  const encoded = encodeZonePopulationEstimate(estimate);
  const decoded = decodeZonePopulationEstimate(encoded);

  assert.deepEqual(decoded, estimate);
});

test('shared URLs preserve WorldPop ring populations used by casualty calculations', () => {
  const url = urlWithZonePopulationEstimate('https://example.com/simulate?ast=test', estimate);
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('ast'), 'test');
  assert.deepEqual(decodeZonePopulationEstimate(parsed.searchParams.get('zonePop')), estimate);
});

test('malformed shared population payloads are ignored', () => {
  assert.equal(decodeZonePopulationEstimate('1,2,3'), null);
  assert.equal(decodeZonePopulationEstimate('1,2,3,4,nope,6,7,8,9,10,11,12,13,14,15'), null);
  assert.equal(decodeZonePopulationEstimate('1,2,3,4,-5,6,7,8,9,10,11,12,13,14,15'), null);
});
