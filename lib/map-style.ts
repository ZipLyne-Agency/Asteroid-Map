/** OpenFreeMap dark vector style — no API key, CORS-open, not on typical ad-block lists. */
export const PRIMARY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Local last-resort style so impact rings still render if the vector CDN is blocked.
 * Glyphs stay on OpenFreeMap so city/cluster labels can paint when fonts are reachable.
 */
export const FALLBACK_MAP_STYLE = {
  version: 8 as const,
  name: 'Asteroid Map fallback',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#07080f' },
    },
  ],
};

export type AppMapStyle = typeof PRIMARY_MAP_STYLE | typeof FALLBACK_MAP_STYLE;

export function isIgnorableMapLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return name === 'AbortError' || /aborted/i.test(message);
}

export function nextMapStyle(current: AppMapStyle): AppMapStyle | null {
  return current === PRIMARY_MAP_STYLE ? FALLBACK_MAP_STYLE : null;
}
