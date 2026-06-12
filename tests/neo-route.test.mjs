import assert from 'node:assert/strict';
import test from 'node:test';

import { SUPPORTED_CAD_API_VERSION, parseCadPayload } from '../lib/neo-cad.ts';

const sampleCadPayload = {
  signature: {
    source: 'NASA/JPL SBDB Close Approach Data API',
    version: SUPPORTED_CAD_API_VERSION,
  },
  count: 1,
  fields: ['des', 'fullname', 'cd', 'jd', 'v_rel', 'v_inf', 'h', 'diameter', 'diameter_sigma', 'dist', 'dist_min', 'dist_max', 't_sigma_f'],
  data: [
    ['TEST1', '(TEST1) Sample asteroid', '2026-Jun-15 00:00', '2461206.5', '12.4', '10.8', '22.0', '0.16', '0.02', '0.001', '0.0009', '0.0011', '00:03'],
  ],
};

test('JPL CAD parser maps rows into selectable asteroid records', () => {
  const parsed = parseCadPayload(sampleCadPayload, 'upcoming');

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].source, 'jpl-cad');
  assert.equal(parsed[0].id, 'TEST1');
  assert.equal(parsed[0].name, '(TEST1) Sample asteroid');
  assert.equal(parsed[0].diameter, 160);
  assert.equal(parsed[0].diameterEstimated, false);
  assert.equal(parsed[0].diameterMin, 140);
  assert.equal(parsed[0].diameterMax, 180);
  assert.equal(parsed[0].diameterSigma, 20);
  assert.equal(parsed[0].compositionAssumed, true);
  assert.equal(parsed[0].sourceName, 'NASA/JPL SBDB Close-Approach Data');
  assert.match(parsed[0].sourceUrl, /^https:\/\/ssd-api\.jpl\.nasa\.gov/);
  assert.match(parsed[0].inputUncertainty, /close-approach flyby/);
  assert.equal(parsed[0].velocity, 10.8);
  assert.equal(parsed[0].velocityBasis, 'hyperbolic-excess');
  assert.match(parsed[0].inputUncertainty, /Earth-gravity focusing/);
  assert.match(parsed[0].inputUncertainty, /v-infinity/);
  assert.match(parsed[0].inputUncertainty, /1-sigma diameter uncertainty/);
  assert.equal(parsed[0].missDistanceKm, 149597.8707);
  assert.equal(parsed[0].missDistance, '0.39 LD');
  assert.equal(Math.round(parsed[0].missDistanceMinKm), 134638);
  assert.equal(Math.round(parsed[0].missDistanceMaxKm), 164558);
  assert.equal(parsed[0].missDistanceRange, '0.35 LD-0.43 LD');
  assert.equal(parsed[0].approachTimeUncertainty, '00:03');
  assert.equal('isPotentiallyHazardous' in parsed[0], false);
});

test('JPL CAD parser marks brightness-derived diameters as estimated', () => {
  const parsed = parseCadPayload({
    ...sampleCadPayload,
    data: [
      ['TEST2', '(TEST2) Estimated asteroid', '2026-Jun-16 00:00', '2461207.5', '18.0', '16.0', '24.0', null, null, '0.01', null, null, null],
    ],
  }, 'upcoming');

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].diameterEstimated, true);
  assert.equal(parsed[0].diameterSigma, undefined);
  assert.ok(parsed[0].diameterMin > 10);
  assert.ok(parsed[0].diameterMax > parsed[0].diameter);
  assert.ok(parsed[0].diameter > parsed[0].diameterMin);
  assert.match(parsed[0].inputUncertainty, /assumed albedo range/);
  assert.ok(parsed[0].diameter > 10);
});

test('JPL CAD parser falls back to close-approach relative velocity when v-infinity is absent', () => {
  const parsed = parseCadPayload({
    ...sampleCadPayload,
    data: [
      ['TEST3', '(TEST3) Legacy velocity asteroid', '2026-Jun-17 00:00', '2461208.5', '14.0', null, '23.0', null, null, '0.01', null, null, null],
    ],
  }, 'upcoming');

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].velocity, 14);
  assert.equal(parsed[0].velocityBasis, 'flyby-relative');
  assert.match(parsed[0].inputUncertainty, /close-approach speed/);
});
