import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SearchResultSchema = z.array(
  z.object({
    place_id: z.union([z.string(), z.number()]),
    display_name: z.string(),
    lat: z.string(),
    lon: z.string(),
  }),
);

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_UA = process.env.NOMINATIM_USER_AGENT ?? 'AsteroidMap/1.0 (contact required)';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(8, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '5', 10) || 5));

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding request failed.' }, { status: 502 });
    }

    const raw: unknown = await response.json();
    const parsed = SearchResultSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Unexpected geocoding payload.' }, { status: 502 });
    }

    const results = parsed.data.map((item) => ({
      id: String(item.place_id),
      placeName: item.display_name,
      lat: Number.parseFloat(item.lat),
      lng: Number.parseFloat(item.lon),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Unexpected server error while searching locations.' }, { status: 500 });
  }
}
