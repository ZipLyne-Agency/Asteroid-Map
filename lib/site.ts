/**
 * Canonical site URL for metadata, OG tags, JSON-LD, and sitemaps.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com).
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL.trim());
      if (configured.protocol === 'http:' || configured.protocol === 'https:') return configured.origin;
    } catch {
      // Fall through to the environment-specific default.
    }
  }
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return 'https://asteroidmap.com';
}

export const SITE_NAME = 'Asteroid Impact Simulator';

/** Meta description — ~155 chars, keyword + CTA */
export const SITE_DESCRIPTION =
  'Explore first-order asteroid impact effects on a map: airburst or crater, blast, thermal zones, and broad exposure ranges. Free educational simulator.';

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
