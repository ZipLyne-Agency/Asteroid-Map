import { create } from 'zustand';
import type { ImpactResults, TargetMaterial } from '../lib/physics';

export interface Location {
  lng: number;
  lat: number;
  name: string;
}

export interface Asteroid {
  id: string;
  name: string;
  diameter: number; // meters
  velocity: number; // km/s
  velocityBasis?: 'entry' | 'flyby-relative' | 'hyperbolic-excess';
  composition: 'ice' | 'porous_rock' | 'dense_rock' | 'iron';
  densityKgM3?: number;
  densitySigmaKgM3?: number;
  compositionAssumed?: boolean;
  emoji?: string;      // friendly icon for the card
  blurb?: string;      // one plain-English line: what it is / why it's famous
  date?: string;
  dateIso?: string;
  relativeTime?: string;
  approachType?: 'past' | 'upcoming';
  missDistance?: string;
  missDistanceRange?: string;
  missDistanceKm?: number;
  missDistanceMinKm?: number;
  missDistanceMaxKm?: number;
  approachTimeUncertainty?: string;
  diameterEstimated?: boolean;
  diameterMin?: number;
  diameterMax?: number;
  diameterSigma?: number;
  sourceName?: string;
  sourceUrl?: string;
  inputUncertainty?: string;
  source?: 'historic' | 'jpl-cad' | 'known';
}

export type ActiveSection = 'location' | 'asteroid' | 'report';

// Uniform people-per-km² scenarios. These are not live census/population rasters.
export const DENSITY_PRESETS = {
  dense_urban:  { label: 'Dense urban', sublabel: '10,000 people/km²', value: 10000 },
  urban:        { label: 'Urban',       sublabel: '3,000 people/km²',  value: 3000  },
  suburban:     { label: 'Suburban',    sublabel: '500 people/km²',    value: 500   },
  rural:        { label: 'Rural',       sublabel: '50 people/km²',     value: 50    },
} as const;

export type DensityPreset = keyof typeof DENSITY_PRESETS;

export const MAX_CUSTOM_DENSITY_PER_KM2 = 1_000_000;

export interface PopulationDensitySource {
  sourceName: string;
  sourceUrl: string;
  year: number;
  radiusKm: number;
  totalPopulation: number;
  areaKm2: number;
  note: string;
}

interface AppState {
  location: Location | null;
  setLocation: (loc: Location | null) => void;

  asteroid: Asteroid | null;
  setAsteroid: (ast: Asteroid | null) => void;

  impactAngle: number;
  setImpactAngle: (angle: number) => void;

  targetMaterial: TargetMaterial;
  setTargetMaterial: (material: TargetMaterial) => void;

  simulationStatus: 'idle' | 'running' | 'completed';
  setSimulationStatus: (status: 'idle' | 'running' | 'completed') => void;

  results: ImpactResults | null;
  setResults: (results: ImpactResults | null) => void;

  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;

  densityPreset: DensityPreset;
  setDensityPreset: (p: DensityPreset) => void;
  customDensityPerKm2: number | null;
  customDensitySource: PopulationDensitySource | null;
  setCustomDensityPerKm2: (density: number | null, source?: PopulationDensitySource | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  location: null,
  setLocation: (loc) => {
    set({ location: loc });
    syncToUrl();
  },

  asteroid: null,
  setAsteroid: (ast) => {
    set({ asteroid: ast });
    syncToUrl();
  },

  impactAngle: 45,
  setImpactAngle: (angle) => {
    set({ impactAngle: clampNumber(String(angle), 10, 90, 45) });
    syncToUrl();
  },

  targetMaterial: 'sedimentary',
  setTargetMaterial: (material) => {
    set({ targetMaterial: material });
    syncToUrl();
  },

  simulationStatus: 'idle',
  setSimulationStatus: (status) => set({ simulationStatus: status }),

  results: null,
  setResults: (results) => set({ results }),

  activeSection: 'location',
  setActiveSection: (s) => set({ activeSection: s }),

  densityPreset: 'urban',
  setDensityPreset: (p) => {
    set({ densityPreset: p });
    syncToUrl();
  },

  customDensityPerKm2: null,
  customDensitySource: null,
  setCustomDensityPerKm2: (density, source = null) => {
    set({
      customDensityPerKm2: density === null ? null : clampNumber(String(density), 0, MAX_CUSTOM_DENSITY_PER_KM2, 0),
      customDensitySource: density === null ? null : source,
    });
    syncToUrl();
  },
}));

/** Push asteroid + location into the URL bar so the link is shareable */
function syncToUrl() {
  if (typeof window === 'undefined') return;
  const { asteroid, location, impactAngle, targetMaterial, densityPreset, customDensityPerKm2 } = useAppStore.getState();
  const params = new URLSearchParams();
  if (asteroid) {
    params.set('ast', asteroid.id);
    params.set('name', asteroid.name);
    params.set('d', String(asteroid.diameter));
    params.set('v', String(asteroid.velocity));
    if (asteroid.velocityBasis) params.set('vb', asteroid.velocityBasis);
    params.set('comp', asteroid.composition);
    if (asteroid.densityKgM3) params.set('rho', String(asteroid.densityKgM3));
    if (asteroid.densitySigmaKgM3) params.set('rhosig', String(asteroid.densitySigmaKgM3));
    if (asteroid.source) params.set('src', asteroid.source);
    if (asteroid.diameterEstimated) params.set('de', '1');
    if (asteroid.diameterMin) params.set('dmin', String(asteroid.diameterMin));
    if (asteroid.diameterMax) params.set('dmax', String(asteroid.diameterMax));
    if (asteroid.diameterSigma) params.set('dsig', String(asteroid.diameterSigma));
    if (asteroid.compositionAssumed) params.set('cassume', '1');
    if (asteroid.sourceName) params.set('sn', asteroid.sourceName);
    if (asteroid.sourceUrl) params.set('su', asteroid.sourceUrl);
    if (asteroid.inputUncertainty) params.set('iu', asteroid.inputUncertainty);
    if (asteroid.blurb) params.set('blurb', asteroid.blurb);
    params.set('angle', String(impactAngle));
    params.set('target', targetMaterial);
    params.set('density', densityPreset);
    if (customDensityPerKm2 !== null) params.set('densityCustom', String(customDensityPerKm2));
  }
  if (location) {
    params.set('lat', location.lat.toFixed(5));
    params.set('lng', location.lng.toFixed(5));
    params.set('loc', location.name);
  }
  const qs = params.toString();
  const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', newUrl);
}

/** Read URL params on load and hydrate the store */
export function hydrateFromUrl() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const store = useAppStore.getState();

  const VALID_COMPOSITIONS: Asteroid['composition'][] = ['ice', 'porous_rock', 'dense_rock', 'iron'];
  const VALID_SOURCES: NonNullable<Asteroid['source']>[] = ['historic', 'jpl-cad', 'known'];
  const VALID_TARGETS: TargetMaterial[] = ['water', 'sedimentary', 'crystalline'];
  const VALID_DENSITIES = Object.keys(DENSITY_PRESETS) as DensityPreset[];

  const astId = params.get('ast');
  if (astId) {
    const name = params.get('name')?.trim() || astId;
    // Clamp shared-link params to physically sensible ranges instead of
    // silently simulating garbage from a mangled URL.
    const diameter = clampNumber(params.get('d'), 1, 50_000, 100);
    const velocity = clampNumber(params.get('v'), 0, 72, 20);
    const compParam = params.get('comp') ?? 'dense_rock';
    const comp = (VALID_COMPOSITIONS as string[]).includes(compParam)
      ? (compParam as Asteroid['composition'])
      : 'dense_rock';
    const densityKgM3 = clampOptionalNumber(params.get('rho'), 500, 9000);
    const densitySigmaKgM3 = clampOptionalNumber(params.get('rhosig'), 0, 9000);
    const sourceParam = params.get('src') ?? 'known';
    const source = (VALID_SOURCES as string[]).includes(sourceParam)
      ? (sourceParam as NonNullable<Asteroid['source']>)
      : 'known';
    const velocityBasisParam = params.get('vb') ?? (source === 'jpl-cad' ? 'hyperbolic-excess' : 'entry');
    const velocityBasis: Asteroid['velocityBasis'] =
      velocityBasisParam === 'flyby-relative' || velocityBasisParam === 'hyperbolic-excess'
        ? velocityBasisParam
        : 'entry';
    const diameterEstimated = params.get('de') === '1';
    const [diameterMin, diameterMax] = normalizeOptionalRange(
      clampOptionalNumber(params.get('dmin'), 1, 50_000),
      clampOptionalNumber(params.get('dmax'), 1, 50_000),
    );
    const diameterSigma = clampOptionalNumber(params.get('dsig'), 0, 50_000);
    const compositionAssumed = params.get('cassume') === '1';
    const sourceName = params.get('sn')?.trim();
    const sourceUrl = params.get('su')?.trim();
    const inputUncertainty = params.get('iu')?.trim();
    const blurb = params.get('blurb')?.trim();
    const restoredAsteroid: Asteroid = {
      id: astId,
      name,
      diameter,
      velocity,
      velocityBasis,
      composition: comp,
      ...(densityKgM3 ? { densityKgM3 } : {}),
      ...(densitySigmaKgM3 ? { densitySigmaKgM3 } : {}),
      source,
      ...(diameterEstimated ? { diameterEstimated: true } : {}),
      ...(diameterMin ? { diameterMin } : {}),
      ...(diameterMax ? { diameterMax } : {}),
      ...(diameterSigma ? { diameterSigma } : {}),
      ...(compositionAssumed ? { compositionAssumed: true } : {}),
      ...(sourceName ? { sourceName } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(inputUncertainty ? { inputUncertainty } : {}),
      ...(blurb ? { blurb } : {}),
      ...(source === 'jpl-cad'
        ? {
            sourceName: sourceName ?? 'NASA/JPL SBDB Close-Approach Data',
            sourceUrl: sourceUrl ?? 'https://ssd-api.jpl.nasa.gov/doc/cad.html',
            inputUncertainty: inputUncertainty ?? (diameterEstimated
              ? 'CAD provides a close-approach flyby; diameter is estimated from absolute magnitude and an assumed albedo range.'
              : 'CAD provides a close-approach flyby; composition is not included and is assumed for modeling.'),
          }
        : {}),
    };
    store.setAsteroid(restoredAsteroid);
    store.setImpactAngle(clampNumber(params.get('angle'), 10, 90, 45));
    const targetParam = params.get('target') ?? 'sedimentary';
    store.setTargetMaterial((VALID_TARGETS as string[]).includes(targetParam) ? (targetParam as TargetMaterial) : 'sedimentary');
    const densityParam = params.get('density') ?? 'urban';
    store.setDensityPreset((VALID_DENSITIES as string[]).includes(densityParam) ? (densityParam as DensityPreset) : 'urban');
    store.setCustomDensityPerKm2(clampOptionalNumber(params.get('densityCustom'), 0, MAX_CUSTOM_DENSITY_PER_KM2) ?? null);
  }

  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    const locName = params.get('loc')?.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    store.setLocation({ lat, lng, name: locName });
  }
}

function clampNumber(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampOptionalNumber(raw: string | null, min: number, max: number): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

function normalizeOptionalRange(min: number | undefined, max: number | undefined): [number | undefined, number | undefined] {
  if (min === undefined || max === undefined) return [min, max];
  return min <= max ? [min, max] : [max, min];
}
