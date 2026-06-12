import assert from 'node:assert/strict';
import test from 'node:test';

import { KNOWN_ASTEROID_CATEGORIES } from '../lib/known-asteroids.ts';

const knownAsteroids = Object.values(KNOWN_ASTEROID_CATEGORIES).flatMap((category) => category.items);

test('curated non-CAD watch-list miss distances stay as contextual prose', () => {
  const watchList = KNOWN_ASTEROID_CATEGORIES.watch.items;

  for (const asteroid of watchList) {
    assert.equal(asteroid.source, 'known');
    assert.equal(asteroid.missDistanceKm, undefined);
  }
});

test('known asteroid physical inputs remain finite and positive', () => {
  for (const asteroid of knownAsteroids) {
    assert.ok(Number.isFinite(asteroid.diameter));
    assert.ok(asteroid.diameter > 0);
    assert.ok(Number.isFinite(asteroid.velocity));
    assert.ok(asteroid.velocity > 0);
  }
});

test('curated entry-speed records are not below natural Earth-entry speed', () => {
  for (const asteroid of knownAsteroids) {
    if (asteroid.velocityBasis === 'flyby-relative' || asteroid.velocityBasis === 'hyperbolic-excess') continue;
    assert.ok(asteroid.velocity >= 11.2);
  }
});

test('curated safe-flyby records declare non-entry velocity basis', () => {
  const apophis = knownAsteroids.find((asteroid) => asteroid.id === '99942');
  const yr4 = knownAsteroids.find((asteroid) => asteroid.id === '2024yr4');

  assert.equal(apophis?.velocityBasis, 'hyperbolic-excess');
  assert.ok(Math.abs((apophis?.velocity ?? 0) - 5.84) < 0.01);
  assert.equal(yr4?.velocityBasis, 'flyby-relative');
  assert.match(apophis?.inputUncertainty ?? '', /v-infinity/);
  assert.match(apophis?.inputUncertainty ?? '', /Earth-gravity focusing/);
  assert.match(yr4?.inputUncertainty ?? '', /Earth-gravity focusing/);
});

test('Bennu uses a hypothetical Earth-impact speed instead of orbital average speed', () => {
  const bennu = knownAsteroids.find((asteroid) => asteroid.id === '101955');

  assert.equal(bennu?.velocity, 13);
  assert.equal(bennu?.composition, 'porous_rock');
  assert.equal(bennu?.densityKgM3, 1260);
  assert.equal(bennu?.densitySigmaKgM3, 70);
  assert.match(bennu?.inputUncertainty ?? '', /not Bennu’s average orbital speed/);
});

test('curated asteroid material choices are marked as modeling assumptions', () => {
  for (const asteroid of knownAsteroids) {
    assert.equal(asteroid.compositionAssumed, true);
  }
});

test('curated asteroid records include source and input uncertainty notes', () => {
  for (const asteroid of knownAsteroids) {
    assert.equal(typeof asteroid.sourceName, 'string');
    assert.ok(asteroid.sourceName.length > 0);
    assert.equal(typeof asteroid.sourceUrl, 'string');
    assert.match(asteroid.sourceUrl, /^https:\/\//);
    assert.equal(typeof asteroid.inputUncertainty, 'string');
    assert.ok(asteroid.inputUncertainty.length > 0);
  }
});

test('curated asteroid records do not carry stale hazard booleans', () => {
  for (const asteroid of knownAsteroids) {
    assert.equal('isPotentiallyHazardous' in asteroid, false);
  }
});
