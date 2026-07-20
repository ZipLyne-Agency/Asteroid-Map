const EARTH_RADIUS_KM = 6371.0088;

export const WORLDPOP_YEAR = 2020;
export const MIN_WORLDPOP_RADIUS_KM = 0.5;
export const MAX_WORLDPOP_RADIUS_KM = 100;

export interface PopulationDensityEstimate {
  densityPerKm2: number;
  totalPopulation: number;
  areaKm2: number;
  radiusKm: number;
  sourceName: string;
  sourceUrl: string;
  year: number;
  note: string;
}

export interface PopulationRadiiKm {
  crater: number;
  fireball: number;
  blast: number;
  minorBlast: number;
  thermal: number;
}

export interface PopulationZoneTotals {
  crater: number;
  fireball: number;
  blast: number;
  minorBlast: number;
  thermal: number;
}

export function populationRadiiExceedWorldPopLimit(radii: PopulationRadiiKm): boolean {
  return Object.values(radii).some((radius) => Number.isFinite(radius) && radius > MAX_WORLDPOP_RADIUS_KM);
}

export function circleAreaKm2(radiusKm: number): number {
  const radius = Math.max(0, radiusKm);
  return Math.PI * radius * radius;
}

export function clampPopulationRadiusKm(radiusKm: number): number {
  if (!Number.isFinite(radiusKm)) return 1;
  return Math.min(MAX_WORLDPOP_RADIUS_KM, Math.max(MIN_WORLDPOP_RADIUS_KM, radiusKm));
}

function clampZoneRadiusKm(radiusKm: number): number {
  if (!Number.isFinite(radiusKm)) return 0;
  return Math.max(0, radiusKm);
}

export function geoJsonCircle(lat: number, lng: number, radiusKm: number, points = 48) {
  const safeLat = Math.min(90, Math.max(-90, lat));
  const safeLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  const angularDistance = radiusKm / EARTH_RADIUS_KM;
  const latRad = (safeLat * Math.PI) / 180;
  const lngRad = (safeLng * Math.PI) / 180;
  const coordinates: number[][] = [];

  for (let i = 0; i <= points; i += 1) {
    const bearing = (2 * Math.PI * i) / points;
    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLng = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLat),
    );
    coordinates.push([
      ((((pointLng * 180) / Math.PI + 180) % 360) + 360) % 360 - 180,
      (pointLat * 180) / Math.PI,
    ]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      },
    ],
  };
}

export function populationDensityFromTotal(totalPopulation: number, radiusKm: number): PopulationDensityEstimate {
  const areaKm2 = circleAreaKm2(radiusKm);
  const densityPerKm2 = areaKm2 > 0 ? totalPopulation / areaKm2 : 0;

  return {
    densityPerKm2,
    totalPopulation,
    areaKm2,
    radiusKm,
    sourceName: 'WorldPop Global Project',
    sourceUrl: 'https://api.worldpop.org/v1/services',
    year: WORLDPOP_YEAR,
    note: 'Residential population estimate inside the modeled footprint using WorldPop 100 m gridded estimates. The casualty model applies the resulting footprint-average density uniformly across effect rings.',
  };
}

export function parsePopulationRadii(params: URLSearchParams, fallbackRadiusKm: number): PopulationRadiiKm {
  const fallback = clampPopulationRadiusKm(fallbackRadiusKm);
  const minorBlastParam = params.get('minorBlastKm');
  return {
    crater: clampZoneRadiusKm(Number.parseFloat(params.get('craterKm') ?? '0')),
    fireball: clampZoneRadiusKm(Number.parseFloat(params.get('fireballKm') ?? '0')),
    blast: clampZoneRadiusKm(Number.parseFloat(params.get('blastKm') ?? '0')),
    minorBlast: minorBlastParam === null ? fallback : clampZoneRadiusKm(Number.parseFloat(minorBlastParam)),
    thermal: clampZoneRadiusKm(Number.parseFloat(params.get('thermalKm') ?? '0')),
  };
}

export function populationZonesFromCumulative(
  radii: PopulationRadiiKm,
  cumulativePopulation: (radiusKm: number) => number,
): PopulationZoneTotals {
  const fireballInner = radii.crater;
  const blastInner = Math.max(radii.crater, radii.fireball);
  const thermalInner = Math.max(radii.crater, radii.fireball, radii.blast);
  const severeOuter = Math.max(radii.crater, radii.fireball, radii.blast, radii.thermal);
  const queryRadii = Array.from(new Set([
    radii.crater,
    radii.fireball,
    fireballInner,
    radii.blast,
    blastInner,
    radii.thermal,
    thermalInner,
    radii.minorBlast,
    severeOuter,
  ].filter((radius) => Number.isFinite(radius) && radius > 0))).sort((a, b) => a - b);
  const monotonicTotals = new Map<number, number>();
  let runningMax = 0;
  for (const radius of queryRadii) {
    runningMax = Math.max(runningMax, Math.max(0, cumulativePopulation(radius)));
    monotonicTotals.set(radius, runningMax);
  }
  const populationAt = (radiusKm: number) => radiusKm <= 0 ? 0 : monotonicTotals.get(radiusKm) ?? Math.max(0, cumulativePopulation(radiusKm));
  const craterPopulation = populationAt(radii.crater);

  return {
    crater: craterPopulation,
    fireball: Math.max(0, populationAt(radii.fireball) - populationAt(fireballInner)),
    blast: Math.max(0, populationAt(radii.blast) - populationAt(blastInner)),
    minorBlast: Math.max(0, populationAt(radii.minorBlast) - populationAt(severeOuter)),
    thermal: Math.max(0, populationAt(radii.thermal) - populationAt(thermalInner)),
  };
}

export function interpolatedCumulativePopulation(
  radiusKm: number,
  cumulativePopulation: (queryRadiusKm: number) => number,
): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return 0;
  const queryRadiusKm = clampPopulationRadiusKm(radiusKm);
  const queryPopulation = Math.max(0, cumulativePopulation(queryRadiusKm));
  if (radiusKm >= MIN_WORLDPOP_RADIUS_KM) return queryPopulation;

  const queryArea = circleAreaKm2(queryRadiusKm);
  return queryArea > 0 ? queryPopulation * (circleAreaKm2(radiusKm) / queryArea) : 0;
}

export function scalePopulationRadii(radii: PopulationRadiiKm, scale: number): PopulationRadiiKm {
  const safeScale = Math.max(0, scale);
  return {
    crater: radii.crater * safeScale,
    fireball: radii.fireball * safeScale,
    blast: radii.blast * safeScale,
    minorBlast: radii.minorBlast * safeScale,
    thermal: radii.thermal * safeScale,
  };
}

export function populationRadiiToQuery(results: {
  craterDiameter: number;
  fireballRadius: number;
  blastRadius: number;
  minorBlastRadius: number;
  thermalRadius: number;
}): PopulationRadiiKm {
  return {
    crater: results.craterDiameter / 2 / 1000,
    fireball: results.fireballRadius / 1000,
    blast: results.blastRadius / 1000,
    minorBlast: results.minorBlastRadius / 1000,
    thermal: results.thermalRadius / 1000,
  };
}
