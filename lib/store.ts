import { create } from 'zustand';
import { ImpactResults } from '../lib/physics';

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
  composition: 'ice' | 'porous_rock' | 'dense_rock' | 'iron';
  date?: string;
  dateIso?: string;
  relativeTime?: string;
  approachType?: 'past' | 'upcoming';
  missDistance?: string;
  missDistanceKm?: number;
  source?: 'historic' | 'jpl-cad' | 'known';
  isPotentiallyHazardous?: boolean;
}

export type ActiveSection = 'location' | 'asteroid' | 'report';

// people per km² presets
export const DENSITY_PRESETS = {
  dense_urban:  { label: 'Packed City',   sublabel: 'Like New York or Tokyo', value: 10000 },
  urban:        { label: 'Regular City',  sublabel: 'Like most downtowns',    value: 3000  },
  suburban:     { label: 'Neighborhoods', sublabel: 'Houses with yards',       value: 500   },
  rural:        { label: 'Countryside',   sublabel: 'Farms and open land',     value: 50    },
} as const;

export type DensityPreset = keyof typeof DENSITY_PRESETS;

interface AppState {
  location: Location | null;
  setLocation: (loc: Location | null) => void;

  asteroid: Asteroid | null;
  setAsteroid: (ast: Asteroid | null) => void;

  impactAngle: number;
  setImpactAngle: (angle: number) => void;

  simulationStatus: 'idle' | 'running' | 'completed';
  setSimulationStatus: (status: 'idle' | 'running' | 'completed') => void;

  results: ImpactResults | null;
  setResults: (results: ImpactResults | null) => void;

  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;

  densityPreset: DensityPreset;
  setDensityPreset: (p: DensityPreset) => void;
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
  setImpactAngle: (angle) => set({ impactAngle: angle }),

  simulationStatus: 'idle',
  setSimulationStatus: (status) => set({ simulationStatus: status }),

  results: null,
  setResults: (results) => set({ results }),

  activeSection: 'location',
  setActiveSection: (s) => set({ activeSection: s }),

  densityPreset: 'urban',
  setDensityPreset: (p) => set({ densityPreset: p }),
}));

/** Push asteroid + location into the URL bar so the link is shareable */
function syncToUrl() {
  if (typeof window === 'undefined') return;
  const { asteroid, location } = useAppStore.getState();
  const params = new URLSearchParams();
  if (asteroid) {
    params.set('ast', asteroid.id);
    params.set('name', asteroid.name);
    params.set('d', String(asteroid.diameter));
    params.set('v', String(asteroid.velocity));
    params.set('comp', asteroid.composition);
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

  const astId = params.get('ast');
  if (astId) {
    const name = params.get('name')?.trim() || astId;
    // Clamp shared-link params to physically sensible ranges instead of
    // silently simulating garbage from a mangled URL.
    const diameter = clampNumber(params.get('d'), 1, 1_000_000, 100);
    const velocity = clampNumber(params.get('v'), 11, 72, 20);
    const compParam = params.get('comp') ?? 'dense_rock';
    const comp = (VALID_COMPOSITIONS as string[]).includes(compParam)
      ? (compParam as Asteroid['composition'])
      : 'dense_rock';
    store.setAsteroid({ id: astId, name, diameter, velocity, composition: comp, source: 'known' });
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
