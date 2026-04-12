/**
 * Canonical site URL for metadata, OG tags, JSON-LD, and sitemaps.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com).
 */
export function getSiteUrl(): string {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return 'https://asteroidmap.com';
}

export const SITE_NAME = 'Asteroid Impact Simulator';

/** Meta description — ~155 chars, keyword + CTA */
export const SITE_DESCRIPTION =
  'What happens if an asteroid hits Earth? Pick a city, choose a space rock, and watch the crater, blast wave & fireball appear on the map. Free & fun to explore!';

export const SITE_KEYWORDS = [
  'asteroid impact simulator',
  'what killed the dinosaurs',
  'asteroid hit earth',
  'meteor strike map',
  'crater simulation',
  'asteroid size comparison',
  'near-Earth object',
  'space rock',
  'educational astronomy',
] as const;

export const SITE_CATEGORY = 'science';
