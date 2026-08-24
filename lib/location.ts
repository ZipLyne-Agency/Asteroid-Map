import { MAJOR_CITIES, type MajorCity } from './major-cities.ts';
import type { Location } from './store.ts';

const COORDINATE_NAME = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/;

/** Canonical IANA zone → curated city. Unmapped zones fall back to New York. */
const TIMEZONE_CITY_ID: Record<string, string> = {
  'America/New_York': 'nyc',
  'America/Detroit': 'nyc',
  'America/Indiana/Indianapolis': 'nyc',
  'America/Toronto': 'toronto',
  'America/Chicago': 'chicago',
  'America/Denver': 'chicago',
  'America/Phoenix': 'la',
  'America/Los_Angeles': 'la',
  'America/Vancouver': 'la',
  'America/Tijuana': 'la',
  'America/Mexico_City': 'mexico-city',
  'America/Bogota': 'bogota',
  'America/Lima': 'lima',
  'America/Santiago': 'santiago',
  'America/Sao_Paulo': 'sao-paulo',
  'America/Argentina/Buenos_Aires': 'buenos-aires',
  'Europe/London': 'london',
  'Europe/Dublin': 'london',
  'Europe/Paris': 'paris',
  'Europe/Brussels': 'paris',
  'Europe/Amsterdam': 'paris',
  'Europe/Berlin': 'berlin',
  'Europe/Vienna': 'berlin',
  'Europe/Prague': 'berlin',
  'Europe/Warsaw': 'berlin',
  'Europe/Stockholm': 'berlin',
  'Europe/Copenhagen': 'berlin',
  'Europe/Oslo': 'berlin',
  'Europe/Zurich': 'berlin',
  'Europe/Rome': 'rome',
  'Europe/Madrid': 'madrid',
  'Europe/Lisbon': 'madrid',
  'Europe/Moscow': 'moscow',
  'Europe/Istanbul': 'istanbul',
  'Africa/Cairo': 'cairo',
  'Africa/Lagos': 'lagos',
  'Africa/Nairobi': 'nairobi',
  'Africa/Johannesburg': 'johannesburg',
  'Asia/Jerusalem': 'tel-aviv',
  'Asia/Tel_Aviv': 'tel-aviv',
  'Asia/Dubai': 'dubai',
  'Asia/Qatar': 'dubai',
  'Asia/Kuwait': 'riyadh',
  'Asia/Riyadh': 'riyadh',
  'Asia/Tehran': 'tehran',
  'Asia/Karachi': 'karachi',
  'Asia/Kolkata': 'delhi',
  'Asia/Dhaka': 'dhaka',
  'Asia/Bangkok': 'bangkok',
  'Asia/Jakarta': 'jakarta',
  'Asia/Singapore': 'singapore',
  'Asia/Manila': 'manila',
  'Asia/Shanghai': 'shanghai',
  'Asia/Hong_Kong': 'hong-kong',
  'Asia/Seoul': 'seoul',
  'Asia/Tokyo': 'tokyo',
  'Australia/Sydney': 'sydney',
  'Australia/Melbourne': 'melbourne',
  'Australia/Brisbane': 'sydney',
  'Australia/Perth': 'melbourne',
  'Pacific/Auckland': 'auckland',
};

const DEFAULT_FALLBACK_CITY_ID = 'nyc';

let capturedLandingSearch: string | undefined;

/** First client landing query, before we write a fallback location into the URL. */
export function landingSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  if (capturedLandingSearch === undefined) capturedLandingSearch = window.location.search;
  return new URLSearchParams(capturedLandingSearch);
}

export function resetLandingSearchForTests(): void {
  capturedLandingSearch = undefined;
}

export function parseUrlLocation(params: URLSearchParams): Location | null {
  if (!params.has('lat') || !params.has('lng')) return null;
  const latRaw = params.get('lat')?.trim() ?? '';
  const lngRaw = params.get('lng')?.trim() ?? '';
  if (latRaw === '' || lngRaw === '') return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const name = params.get('loc')?.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const location = { lat, lng, name };
  if (isPlaceholderUrlLocation(location)) return null;
  return location;
}

export function isPlaceholderUrlLocation(location: Location): boolean {
  return location.lat === 0 && location.lng === 0 && COORDINATE_NAME.test(location.name.replaceAll('°', '').trim());
}

export function fallbackCityForTimeZone(timeZone: string): MajorCity {
  const id = TIMEZONE_CITY_ID[timeZone] ?? DEFAULT_FALLBACK_CITY_ID;
  return MAJOR_CITIES.find((city) => city.id === id) ?? MAJOR_CITIES[0];
}

export function cityIdMatchingLocation(location: Location): string {
  const match = MAJOR_CITIES.find(
    (city) => Math.abs(city.lat - location.lat) < 0.02 && Math.abs(city.lng - location.lng) < 0.02,
  );
  return match?.id ?? '';
}

export function shouldApplyBrowserCoordinates(
  current: Location | null,
  fallback: Location,
  simulationStatus: 'idle' | 'running' | 'completed',
): boolean {
  if (simulationStatus !== 'idle') return false;
  if (!current) return true;
  return current.lat === fallback.lat && current.lng === fallback.lng;
}

export function locationFromCity(city: MajorCity): Location {
  return { lat: city.lat, lng: city.lng, name: `${city.name}, ${city.country}` };
}

export async function reverseGeocodeName(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    const data: { name?: string | null } = await res.json();
    return data.name ?? null;
  } catch {
    return null;
  }
}

export function requestBrowserCoordinates(
  geolocation: Geolocation | undefined = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
  timeoutMs = 8000,
): Promise<{ lat: number; lng: number } | null> {
  if (!geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          resolve(null);
          return;
        }
        resolve({ lat, lng });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 300_000 },
    );
  });
}
