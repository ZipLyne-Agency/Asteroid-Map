import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import {
  WORLDPOP_YEAR,
  MAX_WORLDPOP_RADIUS_KM,
  clampPopulationRadiusKm,
  geoJsonCircle,
  interpolatedCumulativePopulation,
  parsePopulationRadii,
  populationRadiiExceedWorldPopLimit,
  populationDensityFromTotal,
  populationZonesFromCumulative,
  scalePopulationRadii,
} from '@/lib/population';
import { WORLDPOP_ROUTE_DEADLINE_MS, withDeadline } from '@/lib/worldpop';

const WORLDPOP_STATS_URL = 'https://api.worldpop.org/v1/services/stats';
const WORLDPOP_TASK_URL = 'https://api.worldpop.org/v1/tasks';

export const maxDuration = 60;

const WorldPopStatsSchema = z.object({
  status: z.string(),
  status_code: z.number().optional(),
  error: z.boolean().optional(),
  error_message: z.string().nullable().optional(),
  taskid: z.string().optional(),
  data: z.object({
    total_population: z.number(),
  }).optional(),
});

async function readWorldPopTask(taskid: string, signal: AbortSignal): Promise<number | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 250));

    const response = await fetch(`${WORLDPOP_TASK_URL}/${encodeURIComponent(taskid)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    });
    if (!response.ok) return null;

    const parsed = WorldPopStatsSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.error) return null;
    if (parsed.data.status === 'finished' && parsed.data.data) return parsed.data.data.total_population;
  }

  return null;
}

async function fetchWorldPopTotal(
  lat: number,
  lng: number,
  radiusKm: number,
  signal: AbortSignal,
): Promise<number | null> {
  if (radiusKm <= 0) return 0;

  const geojson = JSON.stringify(geoJsonCircle(lat, lng, radiusKm));
  const url = new URL(WORLDPOP_STATS_URL);
  url.searchParams.set('dataset', 'wpgppop');
  url.searchParams.set('year', String(WORLDPOP_YEAR));
  url.searchParams.set('runasync', 'false');
  url.searchParams.set('geojson', geojson);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]),
  });

  if (!response.ok) return null;

  const parsed = WorldPopStatsSchema.safeParse(await response.json());
  if (!parsed.success || parsed.data.error) return null;

  return parsed.data.data?.total_population ?? (parsed.data.taskid ? await readWorldPopTask(parsed.data.taskid, signal) : null);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkRateLimit(clientIp(request.headers), 10, 60_000)) {
    return NextResponse.json({ error: 'Too many population requests.' }, { status: 429 });
  }

  const lat = Number.parseFloat(request.nextUrl.searchParams.get('lat') ?? '');
  const lng = Number.parseFloat(request.nextUrl.searchParams.get('lng') ?? '');
  const requestedRadiusKm = Number.parseFloat(request.nextUrl.searchParams.get('radiusKm') ?? '');
  const radiusKm = clampPopulationRadiusKm(requestedRadiusKm);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  }

  try {
    const radii = parsePopulationRadii(request.nextUrl.searchParams, radiusKm);
    const uncertaintyFactor = Math.min(5, Math.max(1, Number.parseFloat(request.nextUrl.searchParams.get('uncertaintyFactor') ?? '1') || 1));
    const lowRadii = scalePopulationRadii(radii, 1 / uncertaintyFactor);
    const highRadii = scalePopulationRadii(radii, uncertaintyFactor);
    if (
      (Number.isFinite(requestedRadiusKm) && requestedRadiusKm > MAX_WORLDPOP_RADIUS_KM) ||
      populationRadiiExceedWorldPopLimit(radii) ||
      populationRadiiExceedWorldPopLimit(lowRadii) ||
      populationRadiiExceedWorldPopLimit(highRadii)
    ) {
      return NextResponse.json(
        { error: 'WorldPop estimate footprint is too large. Use a manual census or gridded-population density.' },
        { status: 400 },
      );
    }
    const radiiForQueries = [radii, lowRadii, highRadii].flatMap((item) => [
      item.crater,
      item.fireball,
      item.blast,
      item.minorBlast,
      item.thermal,
      Math.max(item.crater, item.fireball),
      Math.max(item.crater, item.fireball, item.blast),
      Math.max(item.crater, item.fireball, item.blast, item.thermal),
    ]);
    const uniqueRadii = Array.from(new Set([
      radiusKm,
      ...radiiForQueries,
    ].filter((value) => value > 0).map((value) => clampPopulationRadiusKm(value))));
    const totals = new Map<number, number>();

    const routeController = new AbortController();
    await withDeadline(
      Promise.all(uniqueRadii.map(async (value) => {
        const total = await fetchWorldPopTotal(lat, lng, value, routeController.signal);
        if (total !== null && Number.isFinite(total)) totals.set(value, Math.max(0, total));
      })),
      WORLDPOP_ROUTE_DEADLINE_MS,
      () => routeController.abort(),
    );

    if (totals.size !== uniqueRadii.length) {
      return NextResponse.json({ error: 'WorldPop estimate is incomplete.' }, { status: 504 });
    }

    const totalPopulation = totals.get(radiusKm) ?? null;
    if (totalPopulation === null || !Number.isFinite(totalPopulation)) {
      return NextResponse.json({ error: 'WorldPop estimate is not ready.' }, { status: 504 });
    }

    const populationAt = (value: number) => interpolatedCumulativePopulation(value, (queryRadiusKm) => totals.get(queryRadiusKm) as number);
    const zones = populationZonesFromCumulative(radii, populationAt);
    const lowZones = populationZonesFromCumulative(lowRadii, populationAt);
    const highZones = populationZonesFromCumulative(highRadii, populationAt);

    return NextResponse.json({
      ...populationDensityFromTotal(Math.max(0, totalPopulation), radiusKm),
      zonePopulations: zones,
      lowZonePopulations: lowZones,
      highZonePopulations: highZones,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return NextResponse.json(
      { error: timedOut ? 'WorldPop timed out while estimating population density.' : 'Unexpected server error while estimating population density.' },
      { status: timedOut ? 504 : 500 },
    );
  }
}
