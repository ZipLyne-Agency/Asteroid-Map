import { NextRequest, NextResponse } from 'next/server';
import { addDays, formatISO, subDays } from 'date-fns';
import { CadResponseSchema, SUPPORTED_CAD_API_VERSION, parseCadPayload, type CadPayload } from '@/lib/neo-cad';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

async function fetchCad(
  params: URLSearchParams,
): Promise<{ sourceVersion: string; items: CadPayload }> {
  const url = new URL('https://ssd-api.jpl.nasa.gov/cad.api');
  params.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
    // JPL CAD can stall; never hang the route (and the UI spinner) on it.
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error('JPL request failed');
  }

  const raw: unknown = await response.json();
  const parsed = CadResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid JPL payload');
  }
  if (parsed.data.signature.version !== SUPPORTED_CAD_API_VERSION) {
    throw new Error('Unsupported JPL CAD API version');
  }

  return {
    sourceVersion: parsed.data.signature.version,
    items: parsed.data,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkRateLimit(clientIp(request.headers), 60, 60_000)) {
    return NextResponse.json({ error: 'Too many near-Earth-object requests.' }, { status: 429 });
  }

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
        'Close-approach data is real NASA/JPL CAD data. These are flyby records, not guaranteed impacts; some diameters are estimated from absolute magnitude and assumed albedo, and JPL distance/time uncertainty is shown when supplied. Live CAD records shown here are not PHA classifications.',
    });
  } catch {
    return NextResponse.json({ error: 'Unexpected server error while loading near-Earth objects.' }, { status: 500 });
  }
}
