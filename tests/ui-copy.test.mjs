import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const readmeSource = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const llmsSource = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8');
const jsonLdSource = readFileSync(new URL('../components/JsonLd.tsx', import.meta.url), 'utf8');
const mapSource = readFileSync(new URL('../components/DirectoryMap.tsx', import.meta.url), 'utf8');
const worldPopRouteSource = readFileSync(new URL('../app/api/population/worldpop/route.ts', import.meta.url), 'utf8');
const cadRouteSource = readFileSync(new URL('../app/api/neo/approaches/route.ts', import.meta.url), 'utf8');
const searchRouteSource = readFileSync(new URL('../app/api/geocode/search/route.ts', import.meta.url), 'utf8');
const reverseRouteSource = readFileSync(new URL('../app/api/geocode/reverse/route.ts', import.meta.url), 'utf8');
const globalCssSource = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const robotsSource = readFileSync(new URL('../app/robots.ts', import.meta.url), 'utf8');
const sitemapSource = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
const nextConfigSource = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');

test('energy and seismic report copy avoids exact-effect overclaims', () => {
  assert.match(pageSource, /Modeled kinetic energy equivalent/);
  assert.match(pageSource, /not all energy becomes ground-level blast/);
  assert.match(pageSource, /seismic energy equivalent, not a tectonic quake/);
  assert.match(pageSource, /simulation uses the midpoint estimate/);
  assert.match(pageSource, /modeled impact entry adds Earth-gravity focusing/);
  assert.match(pageSource, /km\/s v∞/);
  assert.match(pageSource, /rough impact entry/);
  assert.match(cadRouteSource, /SUPPORTED_CAD_API_VERSION/);
  assert.match(cadRouteSource, /Unsupported JPL CAD API version/);
  assert.match(pageSource, /densitySigmaKgM3/);
  assert.match(readFileSync(new URL('../lib/physics.ts', import.meta.url), 'utf8'), /STANDARD_SEA_LEVEL_AIR_DENSITY_KG_M3 = 1\.225/);
  assert.match(pageSource, /massLabel\(results\.massKg, asteroid\)/);
  assert.match(pageSource, /energyLabel\(results\.energyMt, asteroid, diameterImpactRange\)/);
  assert.match(pageSource, /hiroshimaLabel\(results\.energyMt, asteroid, diameterImpactRange\)/);
  assert.match(pageSource, /estimateDiameterImpactRange\(asteroid, impactAngle, targetMaterial\)/);
  assert.doesNotMatch(pageSource, /!asteroid\?\.diameterEstimated \|\| !asteroid\.diameterMin \|\| !asteroid\.diameterMax/);
  assert.match(pageSource, /Math\.pow\(asteroid\.diameterMin \/ asteroid\.diameter, 3\)/);
  assert.match(pageSource, /estimateDisplayCasualties\(results, asteroid, density, impactAngle, targetMaterial\)/);
  assert.match(pageSource, /totalExposedLow: Math\.min\(central\.totalExposedLow, lowDiameter\.totalExposedLow, highDiameter\.totalExposedLow\)/);
  assert.match(pageSource, /totalSurvivorsHigh: Math\.max\(central\.totalSurvivorsHigh, lowDiameter\.totalSurvivorsHigh, highDiameter\.totalSurvivorsHigh\)/);
  assert.match(pageSource, /mergeCasualtyRangeWithDiameterFallback/);
  assert.match(pageSource, /function hasDiameterRange\(asteroid: Asteroid\): boolean/);
  assert.match(pageSource, /\? hasDiameterRange\(asteroid\)/);
  assert.doesNotMatch(pageSource, /\? asteroid\.diameterEstimated\s*\?\s*mergeCasualtyRangeWithDiameterFallback/);
  assert.match(pageSource, /estimated-diameter cases/);
  assert.match(pageSource, /measured-diameter uncertainty/);
  assert.match(pageSource, /Custom density/);
  assert.match(pageSource, /WorldPop, Kontur, or GPW/);
  assert.match(pageSource, /Use WorldPop footprint density/);
  assert.match(pageSource, /mapped effect ring/);
  assert.match(pageSource, /allocated by effect ring/);
  assert.match(pageSource, /WorldPop population estimates for each effect ring/);
  assert.match(pageSource, /decodeZonePopulationEstimate/);
  assert.match(pageSource, /urlWithZonePopulationEstimate/);
  assert.match(pageSource, /Modeled exposed population/);
  assert.match(pageSource, /Modeled uninjured survivors inside zones/);
  assert.match(worldPopRouteSource, /WorldPop estimate footprint is too large/);
  assert.match(worldPopRouteSource, /WorldPop estimate is incomplete/);
  assert.match(worldPopRouteSource, /totals\.size !== uniqueRadii\.length/);
  assert.doesNotMatch(worldPopRouteSource, /totals\.get\(queryRadiusKm\) \?\? 0/);
  assert.match(worldPopRouteSource, /populationRadiiExceedWorldPopLimit/);
  assert.doesNotMatch(pageSource, /asteroid\.diameterEstimated && !zonePopulationEstimate/);
  assert.doesNotMatch(pageSource, /The explosion was as powerful as/);
  assert.doesNotMatch(pageSource, /like a \$\{.*earthquake/);
});

test('core controls expose accessible names, state, and reduced-motion behavior', () => {
  assert.match(pageSource, /aria-label="Choose a city"/);
  assert.match(pageSource, /aria-label="Search for a place"/);
  assert.match(pageSource, /aria-pressed=\{selected\}/);
  assert.match(pageSource, /role="status"/);
  assert.match(mapSource, /aria-label="Interactive asteroid impact map"/);
  assert.match(globalCssSource, /:focus-visible/);
  assert.match(globalCssSource, /prefers-reduced-motion: reduce/);
});

test('public proxy routes reject abusive inputs before upstream requests', () => {
  assert.match(searchRouteSource, /query\.length > 200/);
  assert.match(reverseRouteSource, /Math\.abs\(lat\) > 90/);
  assert.match(reverseRouteSource, /Math\.abs\(lng\) > 180/);
  assert.match(cadRouteSource, /checkRateLimit\(clientIp\(request\.headers\)/);
  assert.match(worldPopRouteSource, /export const maxDuration = 60/);
  assert.match(worldPopRouteSource, /url\.searchParams\.set\('runasync', 'false'\)/);
  assert.match(worldPopRouteSource, /AbortSignal\.timeout\(45_000\)/);
  assert.match(worldPopRouteSource, /cache: 'no-store'/);
});

test('metadata and document structure use canonical, crawl-safe semantics', () => {
  assert.match(pageSource, /<h1/);
  assert.match(layoutSource, /`\$\{siteUrl\}\/opengraph-image`/);
  assert.match(layoutSource, /`\$\{siteUrl\}\/twitter-image`/);
  assert.doesNotMatch(layoutSource, /https:\/\/asteroidmap\.com\/(?:opengraph|twitter)-image/);
  assert.match(robotsSource, /userAgent: '\*'/);
  assert.equal((robotsSource.match(/userAgent:/g) ?? []).length, 1);
  assert.doesNotMatch(sitemapSource, /lastModified: new Date/);
  assert.doesNotMatch(jsonLdSource, /FAQPage/);
  assert.match(nextConfigSource, /frame-ancestors 'none'/);
});

test('public docs describe casualty and seismic outputs conservatively', () => {
  const docs = `${readmeSource}\n${llmsSource}\n${jsonLdSource}\n${mapSource}`;

  assert.match(docs, /mapped-radius uncertainty/);
  assert.match(docs, /seismic energy equivalent/);
  assert.match(docs, /diameter range from absolute magnitude/);
  assert.match(docs, /Earth-gravity focusing/);
  assert.match(docs, /published bulk density/);
  assert.match(docs, /diameter cubed/);
  assert.match(docs, /measured 1-sigma diameter uncertainty/);
  assert.match(docs, /casualty ranges are widened with the measured 1-sigma diameter uncertainty/);
  assert.match(pageSource, /Illustrative fatality range/);
  assert.match(pageSource, /Illustrative injury range/);
  assert.match(docs, /heuristic vulnerability rates/);
  assert.match(docs, /Rings show central screening radii/);
  assert.doesNotMatch(docs, /earthquake equivalent/);
});
