import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_WORLDPOP_RADIUS_KM,
  WORLDPOP_YEAR,
  circleAreaKm2,
  clampPopulationRadiusKm,
  geoJsonCircle,
  interpolatedCumulativePopulation,
  parsePopulationRadii,
  populationDensityFromTotal,
  populationRadiiExceedWorldPopLimit,
  populationZonesFromCumulative,
  scalePopulationRadii,
} from '../lib/population.ts';
import { withDeadline } from '../lib/worldpop.ts';

test('WorldPop work is rejected at the route deadline instead of hanging', async () => {
  const startedAt = Date.now();

  await assert.rejects(
    withDeadline(new Promise(() => {}), 25),
    (error) => error instanceof DOMException && error.name === 'TimeoutError',
  );

  assert.ok(Date.now() - startedAt < 250);
});

test('population helper builds a closed GeoJSON circle', () => {
  const circle = geoJsonCircle(40.7128, -74.006, 10, 12);
  const coords = circle.features[0].geometry.coordinates[0];

  assert.equal(circle.type, 'FeatureCollection');
  assert.equal(coords.length, 13);
  assert.deepEqual(coords[0], coords[coords.length - 1]);
});

test('population density derives from total population and footprint area', () => {
  const estimate = populationDensityFromTotal(314_159, 10);

  assert.equal(estimate.year, WORLDPOP_YEAR);
  assert.ok(Math.abs(estimate.areaKm2 - circleAreaKm2(10)) < 0.001);
  assert.ok(estimate.densityPerKm2 > 999);
  assert.ok(estimate.densityPerKm2 < 1001);
});

test('WorldPop lookup radii are clamped for service safety', () => {
  assert.equal(clampPopulationRadiusKm(0.1), 0.5);
  assert.equal(clampPopulationRadiusKm(1000), MAX_WORLDPOP_RADIUS_KM);
  assert.equal(clampPopulationRadiusKm(Number.NaN), 1);
});

test('WorldPop ring parser preserves over-limit radii so requests can be rejected', () => {
  const radii = parsePopulationRadii(new URLSearchParams({
    craterKm: '0',
    fireballKm: '25',
    blastKm: '101',
    minorBlastKm: '120',
    thermalKm: '80',
  }), 1);

  assert.equal(radii.blast, 101);
  assert.equal(radii.minorBlast, 120);
  assert.equal(populationRadiiExceedWorldPopLimit(radii), true);
});

test('population zone totals subtract cumulative circles into non-overlapping rings', () => {
  const zones = populationZonesFromCumulative({
    crater: 1,
    fireball: 2,
    blast: 4,
    thermal: 5,
    minorBlast: 6,
  }, (radius) => radius * 100);

  assert.equal(zones.crater, 100);
  assert.equal(zones.fireball, 100);
  assert.equal(zones.blast, 200);
  assert.equal(zones.thermal, 100);
  assert.equal(zones.minorBlast, 100);
});

test('population zone totals enforce monotonic cumulative raster totals', () => {
  const zones = populationZonesFromCumulative({
    crater: 1,
    fireball: 2,
    blast: 3,
    thermal: 4,
    minorBlast: 5,
  }, (radius) => ({
    1: 1000,
    2: 900,
    3: 1100,
    4: 1050,
    5: 1200,
  })[radius] ?? 0);

  assert.deepEqual(zones, {
    crater: 1000,
    fireball: 0,
    blast: 100,
    thermal: 0,
    minorBlast: 100,
  });
});

test('population radii scale uniformly for uncertainty envelopes', () => {
  const scaled = scalePopulationRadii({
    crater: 1,
    fireball: 2,
    blast: 3,
    thermal: 4,
    minorBlast: 5,
  }, 2);

  assert.deepEqual(scaled, {
    crater: 2,
    fireball: 4,
    blast: 6,
    thermal: 8,
    minorBlast: 10,
  });
});

test('sub-minimum WorldPop radii are area-scaled instead of overcounted', () => {
  const estimate = interpolatedCumulativePopulation(0.25, (radius) => {
    assert.equal(radius, 0.5);
    return 400;
  });

  assert.equal(estimate, 100);
});
