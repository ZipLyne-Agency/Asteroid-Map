import assert from 'node:assert/strict';
import test from 'node:test';

import { hydrateFromUrl, useAppStore } from '../lib/store.ts';

function resetStore() {
  useAppStore.setState({
    location: null,
    asteroid: null,
    impactAngle: 45,
    targetMaterial: 'sedimentary',
    densityPreset: 'urban',
    customDensityPerKm2: null,
    customDensitySource: null,
    simulationStatus: 'idle',
    results: null,
    activeSection: 'location',
  });
}

function installWindow(search = '') {
  let currentUrl = `/simulate${search}`;
  globalThis.window = {
    location: {
      pathname: '/simulate',
      search,
    },
    history: {
      replaceState: (_state, _title, url) => {
        currentUrl = url;
      },
    },
  };
  return {
    get url() {
      return currentUrl;
    },
  };
}

test('shared URLs preserve casualty-affecting density and target material inputs', () => {
  resetStore();
  installWindow('?ast=test&name=Test&d=370&v=20&comp=dense_rock&angle=35&target=water&density=rural&lat=40&lng=-73&loc=Test%20City');

  hydrateFromUrl();

  const state = useAppStore.getState();
  assert.equal(state.targetMaterial, 'water');
  assert.equal(state.densityPreset, 'rural');
  assert.equal(state.impactAngle, 35);
  assert.equal(state.asteroid?.diameter, 370);
  assert.equal(state.location?.name, 'Test City');
});

test('density preset changes are written into shared URLs', () => {
  resetStore();
  const windowState = installWindow('');
  const store = useAppStore.getState();

  store.setAsteroid({ id: 'test', name: 'Test', diameter: 100, velocity: 20, composition: 'dense_rock' });
  useAppStore.getState().setDensityPreset('dense_urban');

  assert.match(windowState.url, /density=dense_urban/);
});

test('custom exposure density is preserved in shared URLs', () => {
  resetStore();
  const windowState = installWindow('');
  const store = useAppStore.getState();

  store.setAsteroid({ id: 'test', name: 'Test', diameter: 100, velocity: 20, composition: 'dense_rock' });
  useAppStore.getState().setCustomDensityPerKm2(12345);

  assert.match(windowState.url, /densityCustom=12345/);

  resetStore();
  installWindow('?ast=test&name=Test&d=100&v=20&comp=dense_rock&densityCustom=12345');
  hydrateFromUrl();

  assert.equal(useAppStore.getState().customDensityPerKm2, 12345);
});

test('shared URLs preserve estimated CAD diameter uncertainty metadata', () => {
  resetStore();
  const windowState = installWindow('');
  const store = useAppStore.getState();

  store.setAsteroid({
    id: 'cad-test',
    name: 'CAD Test',
    diameter: 120,
    diameterEstimated: true,
    diameterMin: 90,
    diameterMax: 210,
    velocity: 18,
    velocityBasis: 'flyby-relative',
    composition: 'dense_rock',
    compositionAssumed: true,
    source: 'jpl-cad',
  });

  assert.match(windowState.url, /src=jpl-cad/);
  assert.match(windowState.url, /vb=flyby-relative/);
  assert.match(windowState.url, /de=1/);
  assert.match(windowState.url, /dmin=90/);
  assert.match(windowState.url, /dmax=210/);
  assert.match(windowState.url, /cassume=1/);

  resetStore();
  installWindow('?ast=cad-test&name=CAD%20Test&d=120&v=18&comp=dense_rock&src=jpl-cad&de=1&dmin=90&dmax=210&cassume=1');
  hydrateFromUrl();

  const asteroid = useAppStore.getState().asteroid;
  assert.equal(asteroid?.source, 'jpl-cad');
  assert.equal(asteroid?.diameterEstimated, true);
  assert.equal(asteroid?.diameterMin, 90);
  assert.equal(asteroid?.diameterMax, 210);
  assert.equal(asteroid?.velocityBasis, 'hyperbolic-excess');
  assert.equal(asteroid?.compositionAssumed, true);
  assert.equal(asteroid?.sourceName, 'NASA/JPL SBDB Close-Approach Data');
  assert.match(asteroid?.inputUncertainty ?? '', /assumed albedo range/);
});

test('shared URLs preserve CAD hyperbolic-excess velocity basis', () => {
  resetStore();
  const windowState = installWindow('');
  const store = useAppStore.getState();

  store.setAsteroid({
    id: 'cad-vinf',
    name: 'CAD v-infinity',
    diameter: 160,
    velocity: 10.8,
    velocityBasis: 'hyperbolic-excess',
    composition: 'dense_rock',
    source: 'jpl-cad',
  });

  assert.match(windowState.url, /vb=hyperbolic-excess/);

  resetStore();
  installWindow('?ast=cad-vinf&name=CAD%20v-infinity&d=160&v=10.8&comp=dense_rock&src=jpl-cad&vb=hyperbolic-excess');
  hydrateFromUrl();

  assert.equal(useAppStore.getState().asteroid?.velocityBasis, 'hyperbolic-excess');
});

test('shared URLs keep legacy CAD flyby-relative velocity basis', () => {
  resetStore();
  installWindow('?ast=cad-legacy&name=CAD%20Legacy&d=160&v=12.4&comp=dense_rock&src=jpl-cad&vb=flyby-relative');
  hydrateFromUrl();

  assert.equal(useAppStore.getState().asteroid?.velocityBasis, 'flyby-relative');
});

test('shared URLs restore curated asteroid source and uncertainty metadata', () => {
  resetStore();
  const windowState = installWindow('');
  const store = useAppStore.getState();

  store.setAsteroid({
    id: 'chelyabinsk',
    name: 'The Chelyabinsk Fireball',
    diameter: 19,
    velocity: 19.2,
    velocityBasis: 'entry',
    composition: 'dense_rock',
    densityKgM3: 3300,
    densitySigmaKgM3: 120,
    compositionAssumed: true,
    source: 'known',
    sourceName: 'NASA Planetary Defense',
    sourceUrl: 'https://www.nasa.gov/solar-system/five-years-after-the-chelyabinsk-meteor-nasa-leads-efforts-in-planetary-defense/',
    inputUncertainty: 'Size and energy are constrained by observations, but local injuries came mostly from building-glass damage.',
    blurb: 'Blew up about 14 miles above Russia in 2013. Broken glass and blast effects injured more than 1,600 people.',
  });

  assert.match(windowState.url, /src=known/);
  assert.match(windowState.url, /rho=3300/);
  assert.match(windowState.url, /rhosig=120/);
  assert.match(windowState.url, /sn=NASA\+Planetary\+Defense/);
  assert.match(windowState.url, /iu=Size\+and\+energy/);

  resetStore();
  installWindow(windowState.url.replace('/simulate', ''));

  hydrateFromUrl();

  const asteroid = useAppStore.getState().asteroid;
  assert.equal(asteroid?.id, 'chelyabinsk');
  assert.equal(asteroid?.source, 'known');
  assert.equal(asteroid?.velocityBasis, 'entry');
  assert.equal(asteroid?.densityKgM3, 3300);
  assert.equal(asteroid?.densitySigmaKgM3, 120);
  assert.equal(asteroid?.compositionAssumed, true);
  assert.equal(asteroid?.sourceName, 'NASA Planetary Defense');
  assert.match(asteroid?.sourceUrl ?? '', /^https:\/\/www\.nasa\.gov/);
  assert.match(asteroid?.inputUncertainty ?? '', /local injuries/);
  assert.equal(asteroid?.blurb?.includes('1,600'), true);
});
