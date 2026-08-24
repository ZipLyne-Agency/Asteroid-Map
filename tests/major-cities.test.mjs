import assert from 'node:assert/strict';
import test from 'node:test';

import { MAJOR_CITIES } from '../lib/major-cities.ts';

/** City-center references (WGS84), mostly Wikipedia / OSM city-hall or historic-center points. */
const CITY_CENTER_REFERENCE = {
  nyc: [40.7128, -74.006],
  la: [34.0522, -118.2437],
  chicago: [41.8781, -87.6298],
  'mexico-city': [19.4326, -99.1332],
  toronto: [43.6532, -79.3832],
  london: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  berlin: [52.52, 13.405],
  madrid: [40.4168, -3.7038],
  rome: [41.9028, 12.4964],
  moscow: [55.7558, 37.6173],
  istanbul: [41.0082, 28.9784],
  cairo: [30.0444, 31.2357],
  lagos: [6.5244, 3.3792],
  nairobi: [-1.2921, 36.8219],
  johannesburg: [-26.2041, 28.0473],
  dubai: [25.2048, 55.2708],
  riyadh: [24.7136, 46.6753],
  tehran: [35.6892, 51.389],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  bangalore: [12.9716, 77.5946],
  karachi: [24.8607, 67.0011],
  dhaka: [23.8103, 90.4125],
  bangkok: [13.7563, 100.5018],
  singapore: [1.3521, 103.8198],
  jakarta: [-6.2088, 106.8456],
  manila: [14.5995, 120.9842],
  beijing: [39.9042, 116.4074],
  shanghai: [31.2304, 121.4737],
  'hong-kong': [22.3193, 114.1694],
  seoul: [37.5665, 126.978],
  tokyo: [35.6762, 139.6503],
  osaka: [34.6937, 135.5023],
  sydney: [-33.8688, 151.2093],
  melbourne: [-37.8136, 144.9631],
  auckland: [-36.8509, 174.7645],
  'sao-paulo': [-23.5505, -46.6333],
  rio: [-22.9068, -43.1729],
  'buenos-aires': [-34.6037, -58.3816],
  lima: [-12.0464, -77.0428],
  bogota: [4.711, -74.0721],
  santiago: [-33.4489, -70.6693],
  'tel-aviv': [32.0853, 34.7818],
};

function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

test('major-city ids are unique and coordinates are in range', () => {
  const ids = MAJOR_CITIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const city of MAJOR_CITIES) {
    assert.ok(Number.isFinite(city.lat) && Number.isFinite(city.lng), city.id);
    assert.ok(Math.abs(city.lat) <= 90 && Math.abs(city.lng) <= 180, city.id);
    assert.ok(!(city.lat === 0 && city.lng === 0), `${city.id} must not be Null Island`);
  }
});

test('listed city coordinates stay on the correct city, not a swapped or ocean point', () => {
  for (const city of MAJOR_CITIES) {
    const ref = CITY_CENTER_REFERENCE[city.id];
    assert.ok(ref, `missing reference for ${city.id}`);
    const km = haversineKm(city.lat, city.lng, ref[0], ref[1]);
    assert.ok(km < 25, `${city.id} is ${km.toFixed(1)} km from its city-center reference`);
  }
});

test('southern and eastern cities are in the right hemisphere', () => {
  const byId = Object.fromEntries(MAJOR_CITIES.map((c) => [c.id, c]));
  assert.ok(byId.sydney.lat < 0 && byId.melbourne.lat < 0 && byId.auckland.lat < 0);
  assert.ok(byId['sao-paulo'].lat < 0 && byId.santiago.lat < 0);
  assert.ok(byId.nyc.lat > 0 && byId.london.lat > 0 && byId.tokyo.lat > 0);
  assert.ok(byId.nyc.lng < 0 && byId.tokyo.lng > 0);
  assert.ok(byId['tel-aviv'].lng > 0 && byId['tel-aviv'].lat > 0);
});
