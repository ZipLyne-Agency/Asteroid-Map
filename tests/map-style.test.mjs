import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FALLBACK_MAP_STYLE,
  PRIMARY_MAP_STYLE,
  isIgnorableMapLoadError,
  nextMapStyle,
} from '../lib/map-style.ts';

test('primary style is OpenFreeMap dark, not CARTO CDN', () => {
  assert.match(PRIMARY_MAP_STYLE, /^https:\/\/tiles\.openfreemap\.org\//);
  assert.doesNotMatch(PRIMARY_MAP_STYLE, /cartocdn/);
});

test('fallback style is a local dark canvas so impact rings still render', () => {
  assert.equal(FALLBACK_MAP_STYLE.version, 8);
  assert.equal(FALLBACK_MAP_STYLE.layers[0]?.type, 'background');
});

test('aborted MapLibre requests are ignored; CORS/network failures are not', () => {
  assert.equal(isIgnorableMapLoadError({ name: 'AbortError', message: 'The user aborted a request.' }), true);
  assert.equal(
    isIgnorableMapLoadError({
      name: 'AJAXError',
      message: 'AJAXError: Failed to fetch (0): https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      status: 0,
    }),
    false,
  );
});

test('style fetch failure advances once from OpenFreeMap to the local fallback', () => {
  assert.equal(nextMapStyle(PRIMARY_MAP_STYLE), FALLBACK_MAP_STYLE);
  assert.equal(nextMapStyle(FALLBACK_MAP_STYLE), null);
});
