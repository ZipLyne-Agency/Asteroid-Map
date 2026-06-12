import type { CasualtyZonePopulations } from './physics';

export interface SharedZonePopulationEstimate {
  central: CasualtyZonePopulations;
  low: CasualtyZonePopulations;
  high: CasualtyZonePopulations;
}

const ZONE_KEYS: (keyof CasualtyZonePopulations)[] = ['crater', 'fireball', 'blast', 'minorBlast', 'thermal'];

function zoneToValues(zone: CasualtyZonePopulations): number[] {
  return ZONE_KEYS.map((key) => Math.max(0, Number.isFinite(zone[key]) ? zone[key] : 0));
}

function valuesToZone(values: number[]): CasualtyZonePopulations | null {
  if (values.length !== ZONE_KEYS.length || values.some((value) => !Number.isFinite(value) || value < 0)) return null;

  return {
    crater: values[0],
    fireball: values[1],
    blast: values[2],
    minorBlast: values[3],
    thermal: values[4],
  };
}

export function encodeZonePopulationEstimate(estimate: SharedZonePopulationEstimate): string {
  return [estimate.central, estimate.low, estimate.high]
    .flatMap(zoneToValues)
    .map((value) => String(Number(value.toPrecision(12))))
    .join(',');
}

export function decodeZonePopulationEstimate(value: string | null): SharedZonePopulationEstimate | null {
  if (!value) return null;
  const values = value.split(',').map((item) => Number(item));
  if (values.length !== ZONE_KEYS.length * 3) return null;

  const central = valuesToZone(values.slice(0, 5));
  const low = valuesToZone(values.slice(5, 10));
  const high = valuesToZone(values.slice(10, 15));
  if (!central || !low || !high) return null;

  return { central, low, high };
}

export function urlWithZonePopulationEstimate(url: string, estimate: SharedZonePopulationEstimate | null): string {
  const nextUrl = new URL(url);
  if (estimate) {
    nextUrl.searchParams.set('zonePop', encodeZonePopulationEstimate(estimate));
  } else {
    nextUrl.searchParams.delete('zonePop');
  }

  return nextUrl.toString();
}
