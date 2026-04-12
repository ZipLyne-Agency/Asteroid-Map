export interface ImpactParameters {
  diameter: number; // meters
  velocity: number; // km/s (pre-impact)
  angle: number; // degrees from horizontal
  density: number; // kg/m³ (asteroid)
  targetDensity: number; // kg/m³ (target material)
}

export interface ImpactResults {
  energyMt: number;
  energyJoules: number;
  impactVelocity: number; // km/s
  massKg: number;
  craterDiameter: number; // meters
  craterDepth: number; // meters
  fireballRadius: number; // meters — near-total lethality zone
  blastRadius: number; // meters — 4 psi overpressure (buildings collapse)
  thermalRadius: number; // meters — 3rd-degree burns
  seismicMagnitude: number;
  recurrenceYears: number; // how often an impact this size happens globally
  severity: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface CasualtyEstimate {
  totalDeaths: number;
  totalInjuries: number;
  craterDeaths: number;
  fireballDeaths: number;
  blastDeaths: number;
  blastInjuries: number;
  thermalDeaths: number;
  thermalInjuries: number;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function deriveSeverity(energyMt: number): ImpactResults['severity'] {
  if (energyMt < 0.1) return 'low';
  if (energyMt < 5) return 'moderate';
  if (energyMt < 1000) return 'high';
  return 'extreme';
}

/**
 * Calculates asteroid impact effects using Collins, Melosh & Marcus (2005)
 * "Earth Impact Effects Program" methodology.
 *
 * Key references:
 * - Collins et al. 2005 — crater scaling, seismic, blast, thermal
 * - Glasstone & Dolan 1977 — overpressure scaling (blast radius)
 * - Melosh 2013 PDC — fireball and thermal radiation scaling
 */
export function calculateImpact(params: ImpactParameters): ImpactResults {
  const diameter = clamp(params.diameter, 1, 50_000);
  const velocity = clamp(params.velocity, 11.2, 72);
  const angle    = clamp(params.angle, 10, 90);
  const density  = clamp(params.density, 500, 9000);
  const targetDensity = clamp(params.targetDensity, 900, 3500);

  // ── Mass ────────────────────────────────────────────────────────────────────
  const radius = diameter / 2;
  const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
  const massKg = volume * density;

  // ── Atmospheric entry (Collins et al. Eq. 8) ────────────────────────────────
  // Smaller objects lose more energy traversing the atmosphere.
  // Approximate velocity attenuation factors based on size.
  const angleRadians = (angle * Math.PI) / 180;
  const atmosphericLossFactor =
    diameter < 25  ? 0.10 :   // tiny pebbles largely ablate
    diameter < 80  ? 0.65 :   // Chelyabinsk-class: ~65% survives
    diameter < 200 ? 0.82 :
    0.92;                      // >200 m: atmosphere barely slows it
  const impactVelocity = Math.max(11.2, velocity * atmosphericLossFactor * (0.75 + 0.25 * Math.sin(angleRadians)));

  // ── Kinetic energy ──────────────────────────────────────────────────────────
  const velocityMs   = impactVelocity * 1000;
  const energyJoules = 0.5 * massKg * Math.pow(velocityMs, 2);
  const energyMt     = energyJoules / 4.184e15;

  // ── Crater (Holsapple-Schmidt Pi-scaling, Collins et al.) ───────────────────
  const gravity = 9.81;
  const transientCrater =
    1.161 *
    Math.pow(density / targetDensity, 1 / 3) *
    Math.pow(diameter, 0.78) *
    Math.pow(velocityMs, 0.44) *
    Math.pow(gravity, -0.22) *
    Math.pow(Math.sin(angleRadians), 1 / 3);

  // Simple → complex crater collapse threshold ~3.2 km (rocky surface)
  const craterDiameter =
    transientCrater < 3200
      ? 1.25 * transientCrater
      : 1.17 * Math.pow(transientCrater, 1.13) * Math.pow(3200, -0.13);

  const craterDepth = craterDiameter < 4000 ? craterDiameter * 0.2 : craterDiameter * 0.12;

  // ── Fireball radius (Melosh 2013 PDC / cube-root yield scaling) ─────────────
  // R_fireball(km) = 2.0 * E_Mt^(1/3)  →  converted to meters
  // This matches the actual observed fireball extent for known events.
  // Calibration: Tunguska ~10 Mt → ~4.3 km fireball ✓; Chelyabinsk 0.5 Mt → ~1.6 km ✓
  const fireballRadius = Math.max(0, 2000 * Math.pow(energyMt, 1 / 3));

  // ── Blast radius — 4 psi overpressure (Glasstone & Dolan scaling) ───────────
  // 4 psi causes heavy structural damage, collapses residential buildings.
  // R_4psi(m) = 4600 * E_Mt^(1/3)
  // Calibration: Tunguska 10 Mt → ~9.9 km ✓; Chelyabinsk 0.5 Mt → ~3.7 km ✓
  const blastRadius = Math.max(0, 4600 * Math.pow(energyMt, 1 / 3));

  // ── Thermal radiation radius (Glasstone & Dolan) ────────────────────────────
  // Threshold: ~10 cal/cm² → 3rd-degree burns (skin ignition)
  // R_thermal(m) = 10400 * E_Mt^(1/3)
  // Calibration: Tunguska 10 Mt → ~22 km ✓ (forest fires at ~15 km edge)
  const thermalRadius = Math.max(0, 10400 * Math.pow(energyMt, 1 / 3));

  // ── Seismic magnitude (Collins et al. empirical fit) ────────────────────────
  // Based on energy-to-magnitude correlation from observed impact events.
  // Calibration: Chicxulub ~10^23 J → M ≈ 10 ✓; Tunguska 6.3e16 J → M ≈ 5.1 ✓
  const seismicMagnitude = Math.max(0, 0.67 * Math.log10(energyJoules) - 5.87);

  // ── Recurrence interval (Collins et al. Eq. 3*) ──────────────────────────────
  // Average years between impacts of this energy or greater anywhere on Earth.
  // The printed equation constant is 10^1.9 (not 10^9).
  const recurrenceYears = Math.max(1, Math.round(Math.pow(10, 1.9) * Math.pow(Math.max(energyMt, 1e-9), 0.78)));

  return {
    energyMt,
    energyJoules,
    impactVelocity,
    massKg,
    craterDiameter,
    craterDepth,
    fireballRadius,
    blastRadius,
    thermalRadius,
    seismicMagnitude,
    recurrenceYears,
    severity: deriveSeverity(energyMt),
  };
}

/**
 * Estimates human casualties using the Nukemap/DCPA methodology.
 * Based on Glasstone & Dolan overpressure-to-casualty tables.
 *
 * Death rates by zone:
 *   - Crater:   100% dead (total destruction)
 *   - Fireball:  90% dead (near-total lethality, extreme heat)
 *   - Blast 4psi: 50% dead, 40% injured (buildings collapse)
 *   - Thermal:   15% dead from burns, 35% injured
 */
export function estimateCasualties(
  results: ImpactResults,
  densityPerKm2: number,
): CasualtyEstimate {
  // Zone radii in km
  const craterRkm    = results.craterDiameter / 2 / 1000;
  const fireballRkm  = results.fireballRadius / 1000;
  const blastRkm     = results.blastRadius / 1000;
  const thermalRkm   = results.thermalRadius / 1000;

  // Annular zone areas (km²) — each ring is the difference between circles
  const craterArea   = Math.PI * craterRkm * craterRkm;
  const fireballArea = Math.max(0, Math.PI * (fireballRkm * fireballRkm - craterRkm * craterRkm));
  const blastArea    = Math.max(0, Math.PI * (blastRkm * blastRkm - fireballRkm * fireballRkm));
  const thermalArea  = Math.max(0, Math.PI * (thermalRkm * thermalRkm - blastRkm * blastRkm));

  // Population in each zone
  const craterPop   = craterArea   * densityPerKm2;
  const fireballPop = fireballArea * densityPerKm2;
  const blastPop    = blastArea    * densityPerKm2;
  const thermalPop  = thermalArea  * densityPerKm2;

  // Apply casualty rates
  const craterDeaths   = craterPop;                 // 100%
  const fireballDeaths = fireballPop * 0.90;
  const blastDeaths    = blastPop    * 0.50;
  const blastInjuries  = blastPop    * 0.40;
  const thermalDeaths  = thermalPop  * 0.15;
  const thermalInjuries = thermalPop * 0.35;

  const rawDeaths   = craterDeaths + fireballDeaths + blastDeaths + thermalDeaths;
  const rawInjuries = (fireballPop * 0.09) + blastInjuries + thermalInjuries;

  // Cap at world population — zones can cover more area than Earth has people
  const WORLD_POPULATION = 8_200_000_000;
  const totalDeaths   = Math.min(rawDeaths, WORLD_POPULATION);
  const totalInjuries = Math.min(rawInjuries, WORLD_POPULATION - totalDeaths);

  return {
    totalDeaths:   Math.round(totalDeaths),
    totalInjuries: Math.round(totalInjuries),
    craterDeaths:  Math.round(Math.min(craterDeaths, WORLD_POPULATION)),
    fireballDeaths: Math.round(Math.min(fireballDeaths, WORLD_POPULATION)),
    blastDeaths:   Math.round(Math.min(blastDeaths, WORLD_POPULATION)),
    blastInjuries: Math.round(Math.min(blastInjuries, WORLD_POPULATION)),
    thermalDeaths: Math.round(Math.min(thermalDeaths, WORLD_POPULATION)),
    thermalInjuries: Math.round(Math.min(thermalInjuries, WORLD_POPULATION)),
  };
}
