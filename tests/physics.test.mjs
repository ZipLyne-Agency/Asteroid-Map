import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASTEROID_DENSITIES,
  SQUARE_KM_PER_SQUARE_MILE,
  TARGET_DENSITIES,
  calculateImpact,
  effectZoneAreasKm2,
  estimateCasualties,
  estimateCasualtiesFromZonePopulations,
  flybyRelativeToImpactVelocity,
} from '../lib/physics.ts';

const sedimentaryTarget = TARGET_DENSITIES.sedimentary;
const denseRock = ASTEROID_DENSITIES.dense_rock;

test('Chelyabinsk-like object is modeled as an airburst without a crater', () => {
  const result = calculateImpact({
    diameter: 19,
    velocity: 19.2,
    angle: 18,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const casualties = estimateCasualties(result, 3000);

  assert.equal(result.eventType, 'airburst');
  assert.equal(result.craterDiameter, 0);
  assert.equal(result.seismicMagnitude, 0);
  assert.ok(result.energyMt > 0.35 && result.energyMt < 0.55);
  assert.ok(result.burstAltitude > 20_000 && result.burstAltitude < 40_000);
  assert.ok(casualties.totalDeathsHigh === 0);
  assert.ok(casualties.totalInjuries > 1000);
  assert.ok(casualties.totalInjuries < 10_000);
  assert.ok(casualties.totalInjuriesLow < 1600);
  assert.ok(casualties.totalInjuriesHigh > 1600);
});

test('Chelyabinsk-like window-damage footprint stays near NASA reported damage area', () => {
  const result = calculateImpact({
    diameter: 19,
    velocity: 19.2,
    angle: 18,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const windowDamageAreaKm2 = Math.PI * Math.pow(result.minorBlastRadius / 1000, 2);
  const nasaReportedAreaKm2 = 200 * SQUARE_KM_PER_SQUARE_MILE;

  assert.ok(windowDamageAreaKm2 > nasaReportedAreaKm2 * 0.5);
  assert.ok(windowDamageAreaKm2 < nasaReportedAreaKm2 * 1.5);
});

test('Tunguska-like object is an airburst with regional blast footprint', () => {
  const result = calculateImpact({
    diameter: 60,
    velocity: 27,
    angle: 35,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });

  assert.equal(result.eventType, 'airburst');
  assert.equal(result.craterDiameter, 0);
  assert.ok(result.energyMt > 10 && result.energyMt < 40);
  assert.ok(result.burstAltitude > 5_000 && result.burstAltitude < 15_000);
  assert.ok(result.blastRadius > 8_000);
  assert.ok(result.thermalRadius > 20_000);
});

test('Large rocky impactor remains crater-forming and returns casualty ranges', () => {
  const result = calculateImpact({
    diameter: 370,
    velocity: 12.6,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const casualties = estimateCasualties(result, 3000);

  assert.equal(result.eventType, 'ground-impact');
  assert.ok(result.craterDiameter > 4000);
  assert.ok(result.seismicMagnitude > 6);
  assert.ok(casualties.totalDeathsLow < casualties.totalDeathsHigh);
  assert.ok(casualties.totalInjuriesLow < casualties.totalInjuriesHigh);
});

test('Target material density changes crater sizing for ground impacts', () => {
  const base = {
    diameter: 370,
    velocity: 20,
    angle: 45,
    density: denseRock,
  };
  const water = calculateImpact({ ...base, targetDensity: TARGET_DENSITIES.water });
  const crystalline = calculateImpact({ ...base, targetDensity: TARGET_DENSITIES.crystalline });

  assert.equal(water.eventType, 'ground-impact');
  assert.equal(crystalline.eventType, 'ground-impact');
  assert.ok(water.craterDiameter > crystalline.craterDiameter);
});

test('Impactor density directly scales mass and kinetic energy', () => {
  const base = {
    diameter: 100,
    velocity: 20,
    angle: 45,
    targetDensity: sedimentaryTarget,
  };
  const porous = calculateImpact({ ...base, density: 1260 });
  const dense = calculateImpact({ ...base, density: 2520 });

  assert.ok(Math.abs(dense.massKg / porous.massKg - 2) < 0.001);
  assert.ok(dense.energyJoules > porous.energyJoules);
});

test('Severity bands do not classify sub-kilometer impactors as global-scale events', () => {
  const regional = calculateImpact({
    diameter: 370,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const extinctionScale = calculateImpact({
    diameter: 1000,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const massExtinctionScale = calculateImpact({
    diameter: 12_000,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });

  assert.equal(regional.severity, 'high');
  assert.equal(extinctionScale.severity, 'extreme');
  assert.equal(massExtinctionScale.severity, 'extreme');
});

test('Recurrence estimates align with NASA public hazard-scale anchor sizes', () => {
  const cases = [
    { diameter: 10, min: 8, max: 12 },
    { diameter: 50, min: 800, max: 1200 },
    { diameter: 140, min: 16_000, max: 24_000 },
    { diameter: 1000, min: 560_000, max: 840_000 },
    { diameter: 10_000, min: 80_000_000, max: 120_000_000 },
  ];

  for (const item of cases) {
    const result = calculateImpact({
      diameter: item.diameter,
      velocity: 17,
      angle: 45,
      density: 2600,
      targetDensity: sedimentaryTarget,
    });
    assert.ok(result.recurrenceYears >= item.min);
    assert.ok(result.recurrenceYears <= item.max);
  }
});

test('Flyby-relative speeds are converted to impact-entry speeds with Earth gravity', () => {
  assert.ok(Math.abs(flybyRelativeToImpactVelocity(0) - 11.2) < 0.001);
  assert.ok(Math.abs(flybyRelativeToImpactVelocity(7.42) - 13.43) < 0.02);
  assert.ok(flybyRelativeToImpactVelocity(20) > 20);
});

test('Casualty estimates are zero for unpopulated scenarios', () => {
  const result = calculateImpact({
    diameter: 140,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const casualties = estimateCasualties(result, 0);

  assert.equal(casualties.totalDeathsLow, 0);
  assert.equal(casualties.totalDeathsHigh, 0);
  assert.equal(casualties.totalInjuriesLow, 0);
  assert.equal(casualties.totalInjuriesHigh, 0);
  assert.equal(casualties.totalExposedLow, 0);
  assert.equal(casualties.totalExposedHigh, 0);
  assert.equal(casualties.totalSurvivorsLow, 0);
  assert.equal(casualties.totalSurvivorsHigh, 0);
});

test('Casualty ranges scale with density and stay bounded by world population', () => {
  const regional = calculateImpact({
    diameter: 500,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const sparse = estimateCasualties(regional, 50);
  const dense = estimateCasualties(regional, 10_000);
  const global = calculateImpact({
    diameter: 5000,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const extreme = estimateCasualties(global, 1_000_000);

  assert.ok(sparse.totalDeathsHigh < dense.totalDeathsHigh);
  assert.ok(sparse.totalInjuriesHigh < dense.totalInjuriesHigh);
  assert.ok(extreme.totalDeathsHigh <= 8_200_000_000);
  assert.ok(extreme.totalDeathsHigh + extreme.totalInjuriesHigh <= 8_200_000_000);
  assert.ok(extreme.totalDeathsLow + extreme.totalInjuriesLow <= extreme.totalExposedLow);
  assert.ok(extreme.totalDeathsHigh + extreme.totalInjuriesHigh <= extreme.totalExposedHigh);
  assert.ok(extreme.totalSurvivorsHigh <= 8_200_000_000);
  assert.ok(extreme.totalDeaths + extreme.totalInjuries + extreme.totalSurvivors <= extreme.totalExposed + 1);
});

test('Fatality and injury high estimates do not exceed total exposed population in modeled zones', () => {
  const result = calculateImpact({
    diameter: 370,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const densityPerKm2 = 3000;
  const casualties = estimateCasualties(result, densityPerKm2);
  const exposedRadiusKm = Math.max(
    result.craterDiameter / 2,
    result.fireballRadius,
    result.blastRadius,
    result.minorBlastRadius,
    result.thermalRadius,
  ) / 1000 * result.uncertaintyFactor;
  const exposedPopulation = Math.PI * exposedRadiusKm * exposedRadiusKm * densityPerKm2;

  assert.equal(casualties.totalExposedHigh, Math.round(exposedPopulation));
  assert.ok(casualties.totalDeathsLow + casualties.totalInjuriesLow <= casualties.totalExposedLow);
  assert.ok(casualties.totalDeathsHigh + casualties.totalInjuriesHigh <= Math.ceil(exposedPopulation));
  assert.ok(casualties.totalDeaths + casualties.totalInjuries + casualties.totalSurvivors <= casualties.totalExposed + 1);
});

test('Fatality and injury ranges include mapped-radius uncertainty', () => {
  const groundImpact = calculateImpact({
    diameter: 370,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const airburst = calculateImpact({
    diameter: 19,
    velocity: 19.2,
    angle: 18,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });

  const groundCasualties = estimateCasualties(groundImpact, 3000);
  const airburstCasualties = estimateCasualties(airburst, 3000);

  assert.equal(groundImpact.uncertaintyFactor, 2);
  assert.equal(airburst.uncertaintyFactor, 3);
  assert.ok(groundCasualties.totalDeathsLow < groundCasualties.totalDeaths);
  assert.ok(groundCasualties.totalDeathsHigh > groundCasualties.totalDeaths);
  assert.ok(groundCasualties.totalExposedLow < groundCasualties.totalExposed);
  assert.ok(groundCasualties.totalExposedHigh > groundCasualties.totalExposed);
  assert.ok(airburstCasualties.totalInjuriesLow < airburstCasualties.totalInjuries);
  assert.ok(airburstCasualties.totalInjuriesHigh > airburstCasualties.totalInjuries);
});

test('Casualty rings do not double-count when crater radius exceeds fireball radius', () => {
  const result = calculateImpact({
    diameter: 1,
    velocity: 11.2,
    angle: 10,
    density: ASTEROID_DENSITIES.iron,
    targetDensity: sedimentaryTarget,
  });
  const densityPerKm2 = 1_000_000;
  const casualties = estimateCasualties(result, densityPerKm2);
  const craterRadiusKm = result.craterDiameter / 2 / 1000;
  const expectedCraterDeaths = Math.PI * craterRadiusKm * craterRadiusKm * densityPerKm2;

  assert.ok(result.craterDiameter / 2 > result.fireballRadius);
  assert.equal(casualties.fireballDeaths, 0);
  assert.ok(casualties.totalDeathsHigh >= Math.round(expectedCraterDeaths));
});

test('zone-population casualty path matches uniform-density estimate when given equivalent populations', () => {
  const result = calculateImpact({
    diameter: 370,
    velocity: 20,
    angle: 45,
    density: denseRock,
    targetDensity: sedimentaryTarget,
  });
  const densityPerKm2 = 3000;
  const uncertainty = result.uncertaintyFactor;
  const toPopulations = (scale) => {
    const areas = effectZoneAreasKm2(result, scale);
    return {
      crater: areas.crater * densityPerKm2,
      fireball: areas.fireball * densityPerKm2,
      blast: areas.blast * densityPerKm2,
      minorBlast: areas.minorBlast * densityPerKm2,
      thermal: areas.thermal * densityPerKm2,
    };
  };

  const uniform = estimateCasualties(result, densityPerKm2);
  const byZone = estimateCasualtiesFromZonePopulations(
    toPopulations(1),
    toPopulations(1 / uncertainty),
    toPopulations(uncertainty),
  );

  assert.deepEqual(byZone, uniform);
});

test('zone-population casualty path supports non-uniform raster-derived exposure', () => {
  const sparseCraterDenseWindow = estimateCasualtiesFromZonePopulations({
    crater: 0,
    fireball: 0,
    blast: 0,
    thermal: 0,
    minorBlast: 1_000_000,
  });
  const denseCraterSparseWindow = estimateCasualtiesFromZonePopulations({
    crater: 100_000,
    fireball: 0,
    blast: 0,
    thermal: 0,
    minorBlast: 0,
  });

  assert.equal(sparseCraterDenseWindow.totalDeaths, 0);
  assert.ok(sparseCraterDenseWindow.totalInjuries > 0);
  assert.equal(sparseCraterDenseWindow.totalExposed, 1_000_000);
  assert.equal(sparseCraterDenseWindow.totalSurvivors, 998_000);
  assert.equal(denseCraterSparseWindow.totalDeaths, 100_000);
  assert.equal(denseCraterSparseWindow.totalInjuries, 0);
  assert.equal(denseCraterSparseWindow.totalExposed, 100_000);
  assert.equal(denseCraterSparseWindow.totalSurvivors, 0);
});
