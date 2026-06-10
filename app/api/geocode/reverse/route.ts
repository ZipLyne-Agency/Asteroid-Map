import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const ReverseSchema = z.object({
  display_name: z.string().optional(),
});

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_UA = process.env.NOMINATIM_USER_AGENT ?? 'AsteroidMap/1.0 (+https://asteroidmap.com; go@ziplyne.agency)';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkRateLimit(clientIp(request.headers))) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const latValue = request.nextUrl.searchParams.get('lat');
  const lngValue = request.nextUrl.searchParams.get('lng');

  const lat = Number.parseFloat(latValue ?? '');
  const lng = Number.parseFloat(lngValue ?? '');

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('zoom', '12');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': NOMINATIM_UA,
      },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ name: null });
    }

    const raw: unknown = await response.json();
    const parsed = ReverseSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ name: null });
    }

    return NextResponse.json({ name: parsed.data.display_name ?? null });
  } catch {
    return NextResponse.json({ name: null });
  }
}
