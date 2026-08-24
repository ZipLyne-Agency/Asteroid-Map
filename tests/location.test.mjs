import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fallbackCityForTimeZone,
  isPlaceholderUrlLocation,
  landingSearchParams,
  parseUrlLocation,
  resetLandingSearchForTests,
} from '../lib/location.ts';

test('landing search is captured once so a fallback URL is not treated as a shared link', () => {
  resetLandingSearchForTests();
  globalThis.window = { location: { search: '' } };
  assert.equal(landingSearchParams().get('lat'), null);
  globalThis.window = { location: { search: '?lat=32.08530&lng=34.78180&loc=Tel+Aviv%2C+IL' } };
  assert.equal(landingSearchParams().get('lat'), null);
  resetLandingSearchForTests();
  assert.equal(landingSearchParams().get('lat'), '32.08530');
});

test('missing lat/lng query params are not parsed as 0,0', () => {
  assert.equal(parseUrlLocation(new URLSearchParams('')), null);
  assert.equal(parseUrlLocation(new URLSearchParams('lat=&lng=')), null);
  assert.equal(parseUrlLocation(new URLSearchParams('loc=Nowhere')), null);
});

test('valid shared coordinates hydrate', () => {
  const loc = parseUrlLocation(new URLSearchParams('lat=40.71280&lng=-74.00600&loc=New+York%2C+US'));
  assert.equal(loc?.lat, 40.7128);
  assert.equal(loc?.lng, -74.006);
  assert.equal(loc?.name, 'New York, US');
});

test('auto-generated 0,0 coordinate names are placeholders', () => {
  assert.equal(isPlaceholderUrlLocation({ lat: 0, lng: 0, name: '0.0000, 0.0000' }), true);
  assert.equal(isPlaceholderUrlLocation({ lat: 0, lng: 0, name: 'Gulf of Guinea' }), false);
});

test('timezone fallback is a real city, not the ocean', () => {
  const jerusalem = fallbackCityForTimeZone('Asia/Jerusalem');
  assert.equal(jerusalem.id, 'tel-aviv');
  assert.ok(jerusalem.lat > 31 && jerusalem.lat < 33);
  assert.ok(jerusalem.lng > 34 && jerusalem.lng < 36);

  const nyc = fallbackCityForTimeZone('America/New_York');
  assert.equal(nyc.id, 'nyc');

  const unknown = fallbackCityForTimeZone('Not/AZone');
  assert.equal(unknown.id, 'nyc');
  assert.ok(Math.abs(unknown.lat) > 1 || Math.abs(unknown.lng) > 1);
});

test('GPS result is ignored after the user moves off the auto-fallback pin', async () => {
  const { shouldApplyBrowserCoordinates } = await import('../lib/location.ts');
  const fallback = { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv, IL' };
  assert.equal(shouldApplyBrowserCoordinates(fallback, fallback, 'idle'), true);
  assert.equal(
    shouldApplyBrowserCoordinates({ lat: 51.5074, lng: -0.1278, name: 'London, UK' }, fallback, 'idle'),
    false,
  );
  assert.equal(shouldApplyBrowserCoordinates(fallback, fallback, 'running'), false);
});

test('browser geolocation upgrades to a GPS fix and treats denial as no coordinates', async () => {
  const { requestBrowserCoordinates } = await import('../lib/location.ts');
  const granted = {
    getCurrentPosition(success) {
      success({ coords: { latitude: 32.0853, longitude: 34.7818 } });
    },
  };
  const denied = {
    getCurrentPosition(_success, error) {
      error({ code: 1, message: 'denied' });
    },
  };

  assert.deepEqual(await requestBrowserCoordinates(granted), { lat: 32.0853, lng: 34.7818 });
  assert.equal(await requestBrowserCoordinates(denied), null);
  assert.equal(await requestBrowserCoordinates(undefined), null);
});
