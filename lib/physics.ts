export interface ImpactParameters {
  diameter: number; // meters
  velocity: number; // km/s (pre-impact)
  angle: number; // degrees from horizontal
  density: number; // kg/m³ (asteroid)
  targetDensity: number; // kg/m³ (target material)
}

export const MIN_NATURAL_IMPACT_VELOCITY_KM_S = 11.2;

export function flybyRelativeToImpactVelocity(relativeVelocityKmS: number): number {
  const vInf = Math.max(0, relativeVelocityKmS);
  return Math.sqrt(vInf * vInf + MIN_NATURAL_IMPACT_VELOCITY_KM_S * MIN_NATURAL_IMPACT_VELOCITY_KM_S);
}

export interface ImpactResults {
  energyMt: number;
  energyJoules: number;
  impactVelocity: number; // km/s
  massKg: number;
  eventType: 'ground-impact' | 'airburst';
  burstAltitude: number; // meters; 0 for crater-forming impacts
  craterDiameter: number; // meters
  craterDepth: number; // meters
  fireballRadius: number; // meters — extreme thermal exposure zone
  blastRadius: number; // meters — about 4 psi overpressure screening zone
  minorBlastRadius: number; // meters — about 0.5 psi, window-breakage injury zone
  thermalRadius: number; // meters — severe-burn screening zone
  seismicMagnitude: number;
  recurrenceYears: number; // how often an impact this size happens globally
  severity: 'low' | 'moderate' | 'high' | 'extreme';
  uncertaintyFactor: number;
  uncertaintyNote: string;
}

export interface CasualtyEstimate {
  totalExposed: number;
  totalExposedLow: number;
  totalExposedHigh: number;
  totalDeaths: number;
  totalInjuries: number;
  totalSurvivors: number;
  totalDeathsLow: number;
  totalDeathsHigh: number;
  totalInjuriesLow: number;
  totalInjuriesHigh: number;
  totalSurvivorsLow: number;
  totalSurvivorsHigh: number;
  craterDeaths: number;
  fireballDeaths: number;
  blastDeaths: number;
  blastInjuries: number;
  minorBlastInjuries: number;
  thermalDeaths: number;
  thermalInjuries: number;
}

export interface CasualtyZonePopulations {
  crater: number;
  fireball: number;
  blast: number;
  minorBlast: number;
  thermal: number;
}

export const ASTEROID_DENSITIES = {
  ice: 917,           // kg/m³ — cometary ice
  porous_rock: 1500,  // kg/m³ — rubble-pile stony (Bennu-like)
  dense_rock: 2700,   // kg/m³ — solid chondrite (Collins et al. 2005)
  iron: 7900,         // kg/m³ — iron-nickel meteorite
} as const;

export const TARGET_DENSITIES = {
  water: 1000,
  sedimentary: 2500,
  crystalline: 2750,
} as const;

export type TargetMaterial = keyof typeof TARGET_DENSITIES;

export const SQUARE_KM_PER_SQUARE_MILE = 2.58999;
const WORLD_POPULATION = 8_200_000_000;
const STANDARD_SEA_LEVEL_AIR_DENSITY_KG_M3 = 1.225;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function deriveSeverity(energyMt: number): ImpactResults['severity'] {
  if (energyMt < 0.1) return 'low';
  if (energyMt < 5) return 'moderate';
  if (energyMt < 50_000) return 'high';
  return 'extreme';
}

function toGroundFootprint(radiusM: number, altitudeM: number): number {
  return Math.sqrt(Math.max(0, radiusM * radiusM - altitudeM * altitudeM));
}

const RECURRENCE_ANCHORS = [
  { diameterM: 10, years: 10 },
  { diameterM: 50, years: 1000 },
  { diameterM: 140, years: 20_000 },
  { diameterM: 1000, years: 700_000 },
  { diameterM: 10_000, years: 100_000_000 },
] as const;

function estimateRecurrenceYears(diameterM: number): number {
  const anchors = RECURRENCE_ANCHORS;
  if (diameterM <= anchors[0].diameterM) {
    return Math.max(1, Math.round(anchors[0].years * Math.pow(diameterM / anchors[0].diameterM, 2)));
  }

  for (let i = 1; i < anchors.length; i += 1) {
    const lower = anchors[i - 1];
    const upper = anchors[i];
    if (diameterM <= upper.diameterM) {
      const t =
        (Math.log10(diameterM) - Math.log10(lower.diameterM)) /
        (Math.log10(upper.diameterM) - Math.log10(lower.diameterM));
      const years = Math.pow(10, Math.log10(lower.years) + t * (Math.log10(upper.years) - Math.log10(lower.years)));
      return Math.max(1, Math.round(years));
    }
  }

  const largest = anchors[anchors.length - 1];
  return Math.round(largest.years * Math.pow(diameterM / largest.diameterM, 2));
}

/**
 * Calculates first-order impact effects from Collins, Melosh & Marcus (2005)
 * "Earth Impact Effects Program" scaling laws.
 *
 * Key references:
 * - Collins et al. 2005 — atmospheric entry, crater scaling, seismic, thermal
 * - Glasstone & Dolan 1977 — overpressure scaling (blast radius)
 *
 * This is still a screening model, not a hydrodynamic impact code. Results are
 * best read as order-of-magnitude estimates, especially for airbursts.
 */
export function calculateImpact(params: ImpactParameters): ImpactResults {
  const diameter = clamp(params.diameter, 1, 50_000);
  const velocity = clamp(params.velocity, MIN_NATURAL_IMPACT_VELOCITY_KM_S, 72);
  const angle    = clamp(params.angle, 10, 90);
  const density  = clamp(params.density, 500, 9000);
  const targetDensity = clamp(params.targetDensity, 900, 3500);

  // ── Mass ────────────────────────────────────────────────────────────────────
  const radius = diameter / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
  const massKg = volume * density;

  // ── Atmospheric entry (Collins et al. Eqs. 8-18, simplified) ────────────────
  const angleRadians = (angle * Math.PI) / 180;
  const sinAngle = Math.sin(angleRadians);
  const entryVelocityMs = velocity * 1000;
  const scaleHeightM = 8000;
  const surfaceAirDensity = STANDARD_SEA_LEVEL_AIR_DENSITY_KG_M3;
  const dragCoefficient = 2;
  const pancakeFactor = 7;

  const velocityAtAltitude = (altitudeM: number): number => {
    const airDensity = surfaceAirDensity * Math.exp(-altitudeM / scaleHeightM);
    return entryVelocityMs * Math.exp(
      -(3 * airDensity * dragCoefficient * scaleHeightM) / (4 * density * diameter * sinAngle),
    );
  };

  const surfaceVelocityMs = velocityAtAltitude(0);
  const yieldStrengthPa = Math.pow(10, 2.107 + 0.0624 * Math.sqrt(density));
  let breakupAltitude = 0;

  for (let z = 100_000; z >= 0; z -= 100) {
    const airDensity = surfaceAirDensity * Math.exp(-z / scaleHeightM);
    const stagnationPressure = airDensity * Math.pow(velocityAtAltitude(z), 2);
    if (stagnationPressure >= yieldStrengthPa) {
      breakupAltitude = z;
      break;
    }
  }

  let eventType: ImpactResults['eventType'] = 'ground-impact';
  let burstAltitude = 0;
  if (breakupAltitude > 0 && diameter < 1000) {
    const breakupAirDensity = surfaceAirDensity * Math.exp(-breakupAltitude / scaleHeightM);
    const dispersionLength =
      diameter * sinAngle * Math.sqrt(density / (dragCoefficient * breakupAirDensity));
    const candidateBurstAltitude =
      breakupAltitude -
      2 * scaleHeightM *
        Math.log(1 + (dispersionLength / (2 * scaleHeightM)) * Math.sqrt(pancakeFactor * pancakeFactor - 1));
    if (candidateBurstAltitude > 0) {
      eventType = 'airburst';
      burstAltitude = candidateBurstAltitude;
    }
  }

  // ── Kinetic energy ──────────────────────────────────────────────────────────
  const energyJoules = 0.5 * massKg * Math.pow(eventType === 'airburst' ? entryVelocityMs : surfaceVelocityMs, 2);
  const energyMt     = energyJoules / 4.184e15;
  const impactVelocity = (eventType === 'airburst' ? velocityAtAltitude(burstAltitude) : surfaceVelocityMs) / 1000;

  // ── Crater (Holsapple-Schmidt Pi-scaling, Collins et al.) ───────────────────
  const gravity = 9.81;
  const transientCrater =
    eventType === 'airburst'
      ? 0
      : 1.161 *
        Math.pow(density / targetDensity, 1 / 3) *
        Math.pow(diameter, 0.78) *
        Math.pow(surfaceVelocityMs, 0.44) *
        Math.pow(gravity, -0.22) *
        Math.pow(sinAngle, 1 / 3);

  // Simple → complex crater collapse threshold ~3.2 km (rocky surface)
  const craterDiameter =
    transientCrater < 3200
      ? 1.25 * transientCrater
      : 1.17 * Math.pow(transientCrater, 1.13) * Math.pow(3200, -0.13);

  const craterDepth = eventType === 'airburst' ? 0 : craterDiameter < 4000 ? craterDiameter * 0.2 : craterDiameter * 0.12;

  // ── Fireball radius (Melosh 2013 PDC / cube-root yield scaling) ─────────────
  // R_fireball(km) = 2.0 * E_Mt^(1/3)  →  converted to meters
  // This matches the actual observed fireball extent for known events.
  // Calibration: Tunguska ~10 Mt → ~4.3 km fireball ✓; Chelyabinsk 0.5 Mt → ~1.6 km ✓
  const fireballRadius = toGroundFootprint(Math.max(0, 2000 * Math.pow(energyMt, 1 / 3)), burstAltitude);

  // ── Blast radius — 4 psi overpressure (Glasstone & Dolan scaling) ───────────
  // 4 psi causes heavy structural damage, collapses residential buildings.
  // R_4psi(m) = 4600 * E_Mt^(1/3)
  // Calibration: Tunguska 10 Mt → ~9.9 km ✓; Chelyabinsk 0.5 Mt → ~3.7 km ✓
  const blastRadius = toGroundFootprint(Math.max(0, 4600 * Math.pow(energyMt, 1 / 3)), burstAltitude);

  // ── Minor blast radius — about 0.5 psi, window-breakage injury zone ─────────
  // Chelyabinsk produced mostly broken-glass injuries and NASA reports windows
  // blown out across about 200 square miles, far below the 4 psi damage zone.
  const minorBlastRadius = Math.max(0, 16_000 * Math.pow(energyMt, 1 / 3));

  // ── Thermal radiation radius (Glasstone & Dolan) ────────────────────────────
  // Threshold: ~10 cal/cm² → 3rd-degree burns (skin ignition)
  // R_thermal(m) = 10400 * E_Mt^(1/3)
  // Calibration: Tunguska 10 Mt → ~22 km ✓ (forest fires at ~15 km edge)
  const thermalRadius = toGroundFootprint(Math.max(0, 10400 * Math.pow(energyMt, 1 / 3)), burstAltitude);

  // ── Seismic magnitude (Collins et al. empirical fit) ────────────────────────
  // Based on energy-to-magnitude correlation from observed impact events.
  // Calibration: Chicxulub ~10^23 J → M ≈ 10 ✓; Tunguska 6.3e16 J → M ≈ 5.1 ✓
  const seismicMagnitude = eventType === 'airburst' ? 0 : Math.max(0, 0.67 * Math.log10(energyJoules) - 5.87);

  // ── Recurrence interval ─────────────────────────────────────────────────────
  // Approximate global frequency, log-interpolated from NASA hazard-scale size
  // anchors (10 m, 50 m, 140 m, 1 km, 10 km). This is a screening estimate.
  const recurrenceYears = estimateRecurrenceYears(diameter);
  const uncertaintyFactor = eventType === 'airburst' ? 3 : 2;

  return {
    energyMt,
    energyJoules,
    impactVelocity,
    massKg,
    eventType,
    burstAltitude,
    craterDiameter,
    craterDepth,
    fireballRadius,
    blastRadius,
    minorBlastRadius,
    thermalRadius,
    seismicMagnitude,
    recurrenceYears,
    severity: deriveSeverity(energyMt),
    uncertaintyFactor,
    uncertaintyNote:
      eventType === 'airburst'
        ? 'Airburst results are approximate; breakup altitude, fragment strength, weather, terrain, and building stock can shift effects by several-fold.'
        : 'Impact-effect scaling is approximate; terrain, target geology, weather, building stock, and population distribution can shift outcomes by about a factor of two.',
  };
}

export function effectZoneAreasKm2(results: ImpactResults, radiusScale = 1): CasualtyZonePopulations {
  const scale = Math.max(0, radiusScale);
  const craterRkm    = (results.craterDiameter / 2 / 1000) * scale;
  const fireballRkm  = (results.fireballRadius / 1000) * scale;
  const blastRkm     = (results.blastRadius / 1000) * scale;
  const minorBlastRkm = (results.minorBlastRadius / 1000) * scale;
  const thermalRkm   = (results.thermalRadius / 1000) * scale;

  const crater = Math.PI * craterRkm * craterRkm;
  const fireballInnerRkm = craterRkm;
  const blastInnerRkm = Math.max(craterRkm, fireballRkm);
  const thermalInnerRkm = Math.max(craterRkm, fireballRkm, blastRkm);
  const severeOuterRkm = Math.max(craterRkm, fireballRkm, blastRkm, thermalRkm);

  return {
    crater,
    fireball: Math.max(0, Math.PI * (fireballRkm * fireballRkm - fireballInnerRkm * fireballInnerRkm)),
    blast: Math.max(0, Math.PI * (blastRkm * blastRkm - blastInnerRkm * blastInnerRkm)),
    minorBlast: Math.max(0, Math.PI * (minorBlastRkm * minorBlastRkm - severeOuterRkm * severeOuterRkm)),
    thermal: Math.max(0, Math.PI * (thermalRkm * thermalRkm - thermalInnerRkm * thermalInnerRkm)),
  };
}

function zonePopulationsFromDensity(
  results: ImpactResults,
  densityPerKm2: number,
  radiusScale = 1,
): CasualtyZonePopulations {
  const areas = effectZoneAreasKm2(results, radiusScale);
  return {
    crater: areas.crater * densityPerKm2,
    fireball: areas.fireball * densityPerKm2,
    blast: areas.blast * densityPerKm2,
    minorBlast: areas.minorBlast * densityPerKm2,
    thermal: areas.thermal * densityPerKm2,
  };
}

function estimateForZonePopulations(populations: CasualtyZonePopulations, rate: 'low' | 'central' | 'high') {
  const fireballDeathRate = rate === 'low' ? 0.75 : rate === 'high' ? 1 : 0.875;
  const blastDeathRate = rate === 'low' ? 0.05 : rate === 'high' ? 0.50 : 0.275;
  const blastInjuryRate = rate === 'low' ? 0.20 : rate === 'high' ? 0.50 : 0.35;
  const thermalDeathRate = rate === 'low' ? 0.01 : rate === 'high' ? 0.15 : 0.08;
  const thermalInjuryRate = rate === 'low' ? 0.05 : rate === 'high' ? 0.35 : 0.20;
  const minorBlastInjuryRate = rate === 'low' ? 0.001 : rate === 'high' ? 0.003 : 0.002;
  const exposed =
    populations.crater +
    populations.fireball +
    populations.blast +
    populations.minorBlast +
    populations.thermal;

  const craterDeaths = populations.crater;
  const fireballDeaths = populations.fireball * fireballDeathRate;
  const blastDeaths = populations.blast * blastDeathRate;
  const blastInjuries = populations.blast * blastInjuryRate;
  const thermalDeaths = populations.thermal * thermalDeathRate;
  const thermalInjuries = populations.thermal * thermalInjuryRate;
  const minorBlastInjuries = populations.minorBlast * minorBlastInjuryRate;

  return {
    exposed,
    deaths: craterDeaths + fireballDeaths + blastDeaths + thermalDeaths,
    injuries: blastInjuries + thermalInjuries + minorBlastInjuries,
    craterDeaths,
    fireballDeaths,
    blastDeaths,
    blastInjuries,
    minorBlastInjuries,
    thermalDeaths,
    thermalInjuries,
  };
}

function finalizeCasualtyEstimate(
  central: ReturnType<typeof estimateForZonePopulations>,
  low: ReturnType<typeof estimateForZonePopulations>,
  high: ReturnType<typeof estimateForZonePopulations>,
): CasualtyEstimate {
  const normalizeScenario = (scenario: ReturnType<typeof estimateForZonePopulations>) => {
    const exposed = Math.min(scenario.exposed, WORLD_POPULATION);
    const deaths = Math.min(scenario.deaths, exposed);
    const injuries = Math.min(scenario.injuries, exposed - deaths);
    const survivors = Math.max(0, exposed - deaths - injuries);

    return { exposed, deaths, injuries, survivors };
  };
  const centralTotals = normalizeScenario(central);
  const lowTotals = normalizeScenario(low);
  const highTotals = normalizeScenario(high);
  const exposureScenarios = [centralTotals.exposed, lowTotals.exposed, highTotals.exposed];
  const deathScenarios = [centralTotals.deaths, lowTotals.deaths, highTotals.deaths];
  const injuryScenarios = [centralTotals.injuries, lowTotals.injuries, highTotals.injuries];
  const survivorScenarios = [centralTotals.survivors, lowTotals.survivors, highTotals.survivors];
  const totalExposedLow = Math.min(...exposureScenarios);
  const totalExposedHigh = Math.max(...exposureScenarios);
  const totalDeathsLow = Math.min(...deathScenarios);
  const totalDeathsHigh = Math.max(...deathScenarios);
  const totalInjuriesLow = Math.min(...injuryScenarios);
  const totalInjuriesHigh = Math.max(...injuryScenarios);
  const totalSurvivorsLow = Math.min(...survivorScenarios);
  const totalSurvivorsHigh = Math.max(...survivorScenarios);

  return {
    totalExposed: Math.round(centralTotals.exposed),
    totalExposedLow: Math.round(totalExposedLow),
    totalExposedHigh: Math.round(totalExposedHigh),
    totalDeaths:   Math.round(centralTotals.deaths),
    totalInjuries: Math.round(centralTotals.injuries),
    totalSurvivors: Math.round(centralTotals.survivors),
    totalDeathsLow: Math.round(totalDeathsLow),
    totalDeathsHigh: Math.round(totalDeathsHigh),
    totalInjuriesLow: Math.round(totalInjuriesLow),
    totalInjuriesHigh: Math.round(totalInjuriesHigh),
    totalSurvivorsLow: Math.round(totalSurvivorsLow),
    totalSurvivorsHigh: Math.round(totalSurvivorsHigh),
    craterDeaths:  Math.round(Math.min(central.craterDeaths, WORLD_POPULATION)),
    fireballDeaths: Math.round(Math.min(central.fireballDeaths, WORLD_POPULATION)),
    blastDeaths:   Math.round(Math.min(central.blastDeaths, WORLD_POPULATION)),
    blastInjuries: Math.round(Math.min(central.blastInjuries, WORLD_POPULATION)),
    minorBlastInjuries: Math.round(Math.min(central.minorBlastInjuries, WORLD_POPULATION)),
    thermalDeaths: Math.round(Math.min(central.thermalDeaths, WORLD_POPULATION)),
    thermalInjuries: Math.round(Math.min(central.thermalInjuries, WORLD_POPULATION)),
  };
}

export function estimateCasualtiesFromZonePopulations(
  centralPopulations: CasualtyZonePopulations,
  lowPopulations: CasualtyZonePopulations = centralPopulations,
  highPopulations: CasualtyZonePopulations = centralPopulations,
): CasualtyEstimate {
  return finalizeCasualtyEstimate(
    estimateForZonePopulations(centralPopulations, 'central'),
    estimateForZonePopulations(lowPopulations, 'low'),
    estimateForZonePopulations(highPopulations, 'high'),
  );
}

/**
 * Estimates exposed population casualties as broad ranges. These are not
 * medical predictions; they assume a uniform population density and no shelter,
 * evacuation, time-of-day, terrain, weather, or local building vulnerability.
 */
export function estimateCasualties(
  results: ImpactResults,
  densityPerKm2: number,
): CasualtyEstimate {
  const uncertainty = clamp(results.uncertaintyFactor, 1, 5);

  return estimateCasualtiesFromZonePopulations(
    zonePopulationsFromDensity(results, densityPerKm2),
    zonePopulationsFromDensity(results, densityPerKm2, 1 / uncertainty),
    zonePopulationsFromDensity(results, densityPerKm2, uncertainty),
  );
}
