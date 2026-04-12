import { NextRequest, NextResponse } from 'next/server';
import { addDays, formatDistanceToNowStrict, formatISO, subDays } from 'date-fns';
import { z } from 'zod';

const AU_IN_KM = 149_597_870.7;

const CadResponseSchema = z.object({
  signature: z.object({
    source: z.string(),
    version: z.string(),
  }),
  count: z.number().int().nonnegative(),
  fields: z.array(z.string()),
  data: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).optional(),
});

interface ParsedApproach {
  id: string;
  name: string;
  date: string;
  dateIso: string;
  relativeTime: string;
  approachType: 'past' | 'upcoming';
  diameter: number;
  velocity: number;
  missDistanceKm: number;
  missDistance: string;
  composition: 'ice' | 'porous_rock' | 'dense_rock' | 'iron';
  source: 'jpl-cad';
  isPotentiallyHazardous: boolean;
}

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function estimateDiameterMeters(hMagnitude: number): number {
  const albedo = 0.14;
  const diameterKm = (1329 / Math.sqrt(albedo)) * Math.pow(10, -hMagnitude / 5);
  return Math.max(10, diameterKm * 1000);
}

function pickComposition(diameterMeters: number): 'ice' | 'porous_rock' | 'dense_rock' | 'iron' {
  if (diameterMeters >= 1000) return 'dense_rock';
  if (diameterMeters >= 250) return 'porous_rock';
  // Composition is not derivable from CAD size fields; default small objects to stony.
  return 'dense_rock';
}

function formatDistance(missDistanceKm: number): string {
  const lunarDistance = missDistanceKm / 384400;
  const au = missDistanceKm / AU_IN_KM;
  if (lunarDistance < 2) return `${lunarDistance.toFixed(2)} LD`;
  if (au < 0.02) return `${au.toFixed(4)} AU`;
  return `${Math.round(missDistanceKm).toLocaleString()} km`;
}

function julianToIso(jd: number): string {
  if (!Number.isFinite(jd)) return new Date().toISOString();
  return new Date((jd - 2440587.5) * 86400000).toISOString();
}

function relativeLabel(dateIso: string, approachType: 'past' | 'upcoming'): string {
  const value = formatDistanceToNowStrict(new Date(dateIso), { addSuffix: false });
  return approachType === 'past' ? `${value} ago` : `in ${value}`;
}

function parseCadPayload(
  payload: z.infer<typeof CadResponseSchema>,
  approachType: 'past' | 'upcoming',
): ParsedApproach[] {
  if (!payload.data?.length) return [];

  const fieldIndex = new Map(payload.fields.map((field, index) => [field, index]));

  return payload.data
    .map((row): ParsedApproach | null => {
      const des = row[fieldIndex.get('des') ?? -1];
      const fullname = row[fieldIndex.get('fullname') ?? -1];
      const date = row[fieldIndex.get('cd') ?? -1];
      const jd = toNumber(row[fieldIndex.get('jd') ?? -1], Number.NaN);
      const velocity = toNumber(row[fieldIndex.get('v_rel') ?? -1], 15);
      const hMagnitude = toNumber(row[fieldIndex.get('h') ?? -1], 24);
      const diameterKm = toNumber(row[fieldIndex.get('diameter') ?? -1], 0);
      const distAu = toNumber(row[fieldIndex.get('dist') ?? -1], Number.NaN);

      if (!des || typeof des !== 'string' || !date || typeof date !== 'string' || !Number.isFinite(jd)) {
        return null;
      }

      const diameterMeters = diameterKm > 0 ? diameterKm * 1000 : estimateDiameterMeters(hMagnitude);
      const missDistanceKm = Number.isFinite(distAu) ? distAu * AU_IN_KM : 0;
      const resolvedName = typeof fullname === 'string' && fullname.trim().length > 0 ? fullname.trim() : des;
      const dateIso = julianToIso(jd);

      return {
        id: des,
        name: resolvedName,
        date,
        dateIso,
        relativeTime: relativeLabel(dateIso, approachType),
        approachType,
        diameter: diameterMeters,
        velocity,
        missDistanceKm,
        missDistance: formatDistance(missDistanceKm),
        composition: pickComposition(diameterMeters),
        source: 'jpl-cad',
        // Practical proxy for PHA classification: close pass and substantial size.
        isPotentiallyHazardous: missDistanceKm <= 7_500_000 && diameterMeters >= 140,
      };
    })
    .filter((item): item is ParsedApproach => item !== null);
}

async function fetchCad(
  params: URLSearchParams,
): Promise<{ sourceVersion: string; items: z.infer<typeof CadResponseSchema> }> {
  const url = new URL('https://ssd-api.jpl.nasa.gov/cad.api');
  params.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error('JPL request failed');
  }

  const raw: unknown = await response.json();
  const parsed = CadResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid JPL payload');
  }

  return {
    sourceVersion: parsed.data.signature.version,
    items: parsed.data,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const daysPast = Math.min(3650, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('daysPast') ?? '365', 10) || 365));
    const daysFuture = Math.min(3650, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('daysFuture') ?? '365', 10) || 365));
    const limit = Math.min(5000, Math.max(50, Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '500', 10) || 500));

    const now = new Date();
    const dateNow = formatISO(now, { representation: 'date' });
    const dateMin = formatISO(subDays(now, daysPast), { representation: 'date' });
    const dateMax = formatISO(addDays(now, daysFuture), { representation: 'date' });

    const common = new URLSearchParams({
      'dist-max': '0.2',
      neo: 'true',
      body: 'Earth',
      diameter: 'true',
      fullname: 'true',
      limit: String(limit),
    });

    const [pastPayload, upcomingPayload] = await Promise.all([
      fetchCad(
        new URLSearchParams({
          ...Object.fromEntries(common.entries()),
          'date-min': dateMin,
          'date-max': dateNow,
          sort: '-date',
        }),
      ),
      fetchCad(
        new URLSearchParams({
          ...Object.fromEntries(common.entries()),
          'date-min': dateNow,
          'date-max': dateMax,
          sort: 'date',
        }),
      ),
    ]);

    const past = parseCadPayload(pastPayload.items, 'past')
      .sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime())
      .slice(0, limit);

    const upcoming = parseCadPayload(upcomingPayload.items, 'upcoming')
      .sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime())
      .slice(0, limit);

    return NextResponse.json({
      source: {
        provider: 'NASA/JPL SBDB Close-Approach Data API',
        apiVersion: upcomingPayload.sourceVersion,
        generatedAt: new Date().toISOString(),
      },
      queryRange: {
        dateMin,
        dateNow,
        dateMax,
      },
      counts: {
        total: past.length + upcoming.length,
        past: past.length,
        upcoming: upcoming.length,
      },
      past,
      upcoming,
      disclaimer:
        'Close-approach data is real NASA/JPL CAD data. These are flyby records, not guaranteed impacts.',
    });
  } catch {
    return NextResponse.json({ error: 'Unexpected server error while loading near-Earth objects.' }, { status: 500 });
  }
}
