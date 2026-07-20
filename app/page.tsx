'use client';

import { useEffect, useRef, useState, useMemo, useCallback, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore, hydrateFromUrl, DENSITY_PRESETS, type DensityPreset } from '@/lib/store';
import type { Asteroid } from '@/lib/store';
import { calculateImpact, estimateCasualties, estimateCasualtiesFromZonePopulations, ASTEROID_DENSITIES, TARGET_DENSITIES, MIN_NATURAL_IMPACT_VELOCITY_KM_S, flybyRelativeToImpactVelocity, type CasualtyZonePopulations, type TargetMaterial } from '@/lib/physics';
import { KNOWN_ASTEROID_CATEGORIES, type KnownAsteroidCategory } from '@/lib/known-asteroids';
import { MAJOR_CITIES } from '@/lib/major-cities';
import { formatBig, formatRange, formatRecurrence } from '@/lib/format';
import { populationRadiiToQuery } from '@/lib/population';
import { decodeZonePopulationEstimate, urlWithZonePopulationEstimate } from '@/lib/share-population';
import { Play, Share2, Check, Search, ChevronDown, RotateCcw, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const DirectoryMap = dynamic(() => import('@/components/DirectoryMap'), { ssr: false });

const TARGET_MATERIAL_LABELS: Record<TargetMaterial, { label: string; sublabel: string }> = {
  water: { label: 'Water', sublabel: 'Crater scaling only; tsunami and water depth are not modeled' },
  sedimentary: { label: 'Sedimentary rock', sublabel: 'Default land surface' },
  crystalline: { label: 'Crystalline rock', sublabel: 'Hard basement rock' },
};

interface ApproachResponse {
  upcoming?: Asteroid[];
  past?: Asteroid[];
  disclaimer?: string;
}

interface PopulationEstimateResponse {
  densityPerKm2: number;
  totalPopulation: number;
  areaKm2: number;
  radiusKm: number;
  sourceName: string;
  sourceUrl: string;
  year: number;
  note: string;
  zonePopulations?: CasualtyZonePopulations;
  lowZonePopulations?: CasualtyZonePopulations;
  highZonePopulations?: CasualtyZonePopulations;
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 100000 ? 0 : 1)} km`;
  return `${Math.round(m)} m`;
}

function formatDiameter(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function asteroidDiameterLabel(asteroid: Asteroid): string {
  if (asteroid.diameterEstimated && asteroid.diameterMin && asteroid.diameterMax) {
    return `${formatDiameter(asteroid.diameterMin)}-${formatDiameter(asteroid.diameterMax)} estimated diameter`;
  }

  const sigma = asteroid.diameterSigma ? ` ±${formatDiameter(asteroid.diameterSigma)}` : '';
  return `${formatDiameter(asteroid.diameter)}${sigma} wide`;
}

function modeledImpactVelocity(asteroid: Asteroid): number {
  if (asteroid.velocityBasis === 'flyby-relative' || asteroid.velocityBasis === 'hyperbolic-excess') {
    return flybyRelativeToImpactVelocity(asteroid.velocity);
  }
  return Math.max(asteroid.velocity, MIN_NATURAL_IMPACT_VELOCITY_KM_S);
}

function velocityLabel(asteroid: Asteroid): string {
  const modeled = modeledImpactVelocity(asteroid);
  if (asteroid.velocityBasis === 'hyperbolic-excess') {
    return `${asteroid.velocity.toFixed(1)} km/s v∞ · ${modeled.toFixed(1)} km/s modeled impact entry`;
  }
  if (asteroid.velocityBasis === 'flyby-relative') {
    return `${asteroid.velocity.toFixed(1)} km/s flyby · ${modeled.toFixed(1)} km/s rough impact entry`;
  }
  return `${modeled.toFixed(1)} km/s modeled impact speed`;
}

/** Energy in Hiroshima-yield equivalents, using the common ~15 kt TNT reference. */
function hiroshimas(energyMt: number): string {
  const n = energyMt / 0.015; // Hiroshima ≈ 15 kilotons
  if (n < 1) return 'less than one';
  return formatBig(n);
}

type ImpactRange = { low: NonNullable<ReturnType<typeof calculateImpact>>; high: NonNullable<ReturnType<typeof calculateImpact>> };

function densityEnergyScale(asteroid: Asteroid): { low: number; high: number } {
  if (!asteroid.densityKgM3 || !asteroid.densitySigmaKgM3) return { low: 1, high: 1 };
  const relativeSigma = asteroid.densitySigmaKgM3 / asteroid.densityKgM3;
  return { low: Math.max(0, 1 - relativeSigma), high: 1 + relativeSigma };
}

function hiroshimaLabel(energyMt: number, asteroid: Asteroid, impactRange: ImpactRange | null): string {
  const densityScale = densityEnergyScale(asteroid);
  const lowEnergyMt = (impactRange?.low.energyMt ?? energyMt) * densityScale.low;
  const highEnergyMt = (impactRange?.high.energyMt ?? energyMt) * densityScale.high;
  if (!impactRange && densityScale.low === 1 && densityScale.high === 1) return hiroshimas(energyMt);

  const low = lowEnergyMt / 0.015;
  const high = highEnergyMt / 0.015;
  if (high < 1) return 'less than one';
  return formatRange(low, high);
}

/** Crater width in a relatable unit. */
function craterCompare(m: number): string {
  if (m < 100) return 'about the size of a soccer field';
  const fields = Math.round(m / 105); // football field ≈ 105 m
  if (fields < 60) return `as wide as ${fields} football fields`;
  return `wider than most cities`;
}

function compositionLabel(composition: Asteroid['composition']): string {
  switch (composition) {
    case 'ice':
      return 'comet-like ice';
    case 'porous_rock':
      return 'porous rubble-pile material';
    case 'iron':
      return 'iron-nickel material';
    case 'dense_rock':
    default:
      return 'stony material';
  }
}

function asteroidDensity(asteroid: Asteroid): number {
  return asteroid.densityKgM3 ?? ASTEROID_DENSITIES[asteroid.composition];
}

function calculateAsteroidImpact(asteroid: Asteroid, diameter: number, impactAngle: number, targetMaterial: TargetMaterial) {
  return calculateImpact({
    diameter,
    velocity: modeledImpactVelocity(asteroid),
    angle: impactAngle,
    density: asteroidDensity(asteroid),
    targetDensity: TARGET_DENSITIES[targetMaterial],
  });
}

function estimateDiameterImpactRange(
  asteroid: Asteroid | null,
  impactAngle: number,
  targetMaterial: TargetMaterial,
): ImpactRange | null {
  if (!asteroid?.diameterMin || !asteroid.diameterMax) return null;
  return {
    low: calculateAsteroidImpact(asteroid, asteroid.diameterMin, impactAngle, targetMaterial),
    high: calculateAsteroidImpact(asteroid, asteroid.diameterMax, impactAngle, targetMaterial),
  };
}

function massAssumptionLabel(asteroid: Asteroid): string {
  if (asteroid.densityKgM3) {
    const sigma = asteroid.densitySigmaKgM3 ? ` ±${formatBig(asteroid.densitySigmaKgM3)}` : '';
    return `${formatBig(asteroid.densityKgM3)}${sigma} kg/m³ bulk density`;
  }
  return compositionLabel(asteroid.composition);
}

function massEnergyUncertaintyScale(asteroid: Asteroid): { low: number; high: number } | null {
  let low = 1;
  let high = 1;

  if (asteroid.diameterMin && asteroid.diameterMax && asteroid.diameter > 0) {
    low *= Math.pow(asteroid.diameterMin / asteroid.diameter, 3);
    high *= Math.pow(asteroid.diameterMax / asteroid.diameter, 3);
  }

  if (asteroid.densityKgM3 && asteroid.densitySigmaKgM3) {
    const relativeSigma = asteroid.densitySigmaKgM3 / asteroid.densityKgM3;
    low *= Math.max(0, 1 - relativeSigma);
    high *= 1 + relativeSigma;
  }

  return low < 1 || high > 1 ? { low, high } : null;
}

function massLabel(massKg: number, asteroid: Asteroid): string {
  const scale = massEnergyUncertaintyScale(asteroid);
  if (!scale) return `${formatBig(massKg)} kg`;

  return `${formatRange(massKg * scale.low, massKg * scale.high)} kg`;
}

function energyLabel(energyMt: number, asteroid: Asteroid, impactRange: ImpactRange | null): string {
  const densityScale = densityEnergyScale(asteroid);
  if (!impactRange && densityScale.low === 1 && densityScale.high === 1) {
    return energyMt >= 1 ? `${energyMt.toFixed(0)} megatons of TNT` : `${(energyMt * 1000).toFixed(0)} kilotons of TNT`;
  }

  const lowMt = (impactRange?.low.energyMt ?? energyMt) * densityScale.low;
  const highMt = (impactRange?.high.energyMt ?? energyMt) * densityScale.high;
  if (highMt < 1) return `${formatRange(lowMt * 1000, highMt * 1000)} kilotons of TNT`;
  return `${formatRange(lowMt, highMt)} megatons of TNT`;
}

function diameterUncertaintyPhrase(asteroid: Asteroid): string {
  if (asteroid.diameterEstimated) return ', estimated-diameter cases,';
  if (asteroid.diameterMin && asteroid.diameterMax) return ', measured-diameter uncertainty,';
  return '';
}

function hasDiameterRange(asteroid: Asteroid): boolean {
  return Boolean(asteroid.diameterMin && asteroid.diameterMax);
}

function estimateDisplayCasualties(
  results: NonNullable<ReturnType<typeof calculateImpact>>,
  asteroid: Asteroid,
  densityPerKm2: number,
  impactAngle: number,
  targetMaterial: TargetMaterial,
) {
  const central = estimateCasualties(results, densityPerKm2);
  if (!asteroid.diameterMin || !asteroid.diameterMax) return central;

  const lowDiameter = estimateCasualties(
    calculateAsteroidImpact(asteroid, asteroid.diameterMin, impactAngle, targetMaterial),
    densityPerKm2,
  );
  const highDiameter = estimateCasualties(
    calculateAsteroidImpact(asteroid, asteroid.diameterMax, impactAngle, targetMaterial),
    densityPerKm2,
  );

  return {
    ...central,
    totalExposedLow: Math.min(central.totalExposedLow, lowDiameter.totalExposedLow, highDiameter.totalExposedLow),
    totalExposedHigh: Math.max(central.totalExposedHigh, lowDiameter.totalExposedHigh, highDiameter.totalExposedHigh),
    totalDeathsLow: Math.min(central.totalDeathsLow, lowDiameter.totalDeathsLow, highDiameter.totalDeathsLow),
    totalDeathsHigh: Math.max(central.totalDeathsHigh, lowDiameter.totalDeathsHigh, highDiameter.totalDeathsHigh),
    totalInjuriesLow: Math.min(central.totalInjuriesLow, lowDiameter.totalInjuriesLow, highDiameter.totalInjuriesLow),
    totalInjuriesHigh: Math.max(central.totalInjuriesHigh, lowDiameter.totalInjuriesHigh, highDiameter.totalInjuriesHigh),
    totalSurvivorsLow: Math.min(central.totalSurvivorsLow, lowDiameter.totalSurvivorsLow, highDiameter.totalSurvivorsLow),
    totalSurvivorsHigh: Math.max(central.totalSurvivorsHigh, lowDiameter.totalSurvivorsHigh, highDiameter.totalSurvivorsHigh),
  };
}

function mergeCasualtyRangeWithDiameterFallback(
  zoneCasualties: ReturnType<typeof estimateCasualtiesFromZonePopulations>,
  diameterCasualties: ReturnType<typeof estimateDisplayCasualties>,
) {
  return {
    ...zoneCasualties,
    totalExposedLow: Math.min(zoneCasualties.totalExposedLow, diameterCasualties.totalExposedLow),
    totalExposedHigh: Math.max(zoneCasualties.totalExposedHigh, diameterCasualties.totalExposedHigh),
    totalDeathsLow: Math.min(zoneCasualties.totalDeathsLow, diameterCasualties.totalDeathsLow),
    totalDeathsHigh: Math.max(zoneCasualties.totalDeathsHigh, diameterCasualties.totalDeathsHigh),
    totalInjuriesLow: Math.min(zoneCasualties.totalInjuriesLow, diameterCasualties.totalInjuriesLow),
    totalInjuriesHigh: Math.max(zoneCasualties.totalInjuriesHigh, diameterCasualties.totalInjuriesHigh),
    totalSurvivorsLow: Math.min(zoneCasualties.totalSurvivorsLow, diameterCasualties.totalSurvivorsLow),
    totalSurvivorsHigh: Math.max(zoneCasualties.totalSurvivorsHigh, diameterCasualties.totalSurvivorsHigh),
  };
}

function craterZoneDescription(material: TargetMaterial): string {
  return material === 'water' ? 'Water-cavity screening zone' : 'Excavated ground zone';
}

function craterSummary(material: TargetMaterial, diameterM: number): string {
  if (material === 'water') return 'water-entry cavity estimate; tsunami not modeled';
  return craterCompare(diameterM);
}

const SEVERITY: Record<string, { label: string; emoji: string; color: string; ring: string; desc: string }> = {
  low: {
    label: 'Local effects', emoji: '😮', color: 'text-emerald-300', ring: 'border-emerald-500/40 bg-emerald-500/10',
    desc: 'Small impact or airburst effects, with damage highly dependent on breakup height and local exposure.',
  },
  moderate: {
    label: 'City-scale hazard', emoji: '😨', color: 'text-amber-300', ring: 'border-amber-500/40 bg-amber-500/10',
    desc: 'Severe local blast and heat effects are possible inside the modeled zones.',
  },
  high: {
    label: 'Regional catastrophe', emoji: '😱', color: 'text-orange-300', ring: 'border-orange-500/40 bg-orange-500/10',
    desc: 'Large regional to continental damage is possible; exact consequences depend heavily on impact angle, terrain, and population distribution.',
  },
  extreme: {
    label: 'Global-scale impact', emoji: '🦕', color: 'text-red-300', ring: 'border-red-500/50 bg-red-500/12',
    desc: 'Effects can extend far beyond the mapped local zones; climate and global consequences are outside this first-order model.',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);
  const asteroid = useAppStore((s) => s.asteroid);
  const setAsteroid = useAppStore((s) => s.setAsteroid);
  const simulationStatus = useAppStore((s) => s.simulationStatus);
  const setSimulationStatus = useAppStore((s) => s.setSimulationStatus);
  const setResults = useAppStore((s) => s.setResults);
  const results = useAppStore((s) => s.results);
  const densityPreset = useAppStore((s) => s.densityPreset);
  const setDensityPreset = useAppStore((s) => s.setDensityPreset);
  const customDensityPerKm2 = useAppStore((s) => s.customDensityPerKm2);
  const customDensitySource = useAppStore((s) => s.customDensitySource);
  const setCustomDensityPerKm2 = useAppStore((s) => s.setCustomDensityPerKm2);
  const impactAngle = useAppStore((s) => s.impactAngle);
  const setImpactAngle = useAppStore((s) => s.setImpactAngle);
  const targetMaterial = useAppStore((s) => s.targetMaterial);
  const setTargetMaterial = useAppStore((s) => s.setTargetMaterial);

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; placeName: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [liveAsteroids, setLiveAsteroids] = useState<Asteroid[]>([]);
  const [liveAsteroidNote, setLiveAsteroidNote] = useState<string | null>(null);
  const [isLoadingAsteroids, setIsLoadingAsteroids] = useState(true);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [populationEstimateStatus, setPopulationEstimateStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [populationEstimateError, setPopulationEstimateError] = useState<string | null>(null);
  const [zonePopulationEstimate, setZonePopulationEstimate] = useState<{
    central: CasualtyZonePopulations;
    low: CasualtyZonePopulations;
    high: CasualtyZonePopulations;
  } | null>(() => typeof window === 'undefined'
    ? null
    : decodeZonePopulationEstimate(new URLSearchParams(window.location.search).get('zonePop')));

  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false); // mobile: is the picker/results sheet expanded
  const scrollRef = useRef<HTMLDivElement>(null);
  const asteroidAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateFromUrl();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/neo/approaches?daysFuture=365&daysPast=30&limit=50', { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json()) as ApproachResponse;
        if (!res.ok) throw new Error('Could not load NASA/JPL close approaches.');
        const combined = [...(data.upcoming ?? []), ...(data.past ?? [])]
          .filter((a) => Number.isFinite(a.diameter) && Number.isFinite(a.velocity))
          .slice(0, 8);
        setLiveAsteroids(combined);
        setLiveAsteroidNote(data.disclaimer ?? null);
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== 'AbortError') setLiveAsteroidNote('NASA/JPL close approaches are unavailable right now.');
      })
      .finally(() => setIsLoadingAsteroids(false));

    return () => controller.abort();
  }, []);

  const canSimulate = Boolean(location && asteroid);
  const isCompleted = simulationStatus === 'completed';
  const isRunning = simulationStatus === 'running';

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleSimulate = useCallback(() => {
    if (!location || !asteroid) return;
    setSimulationStatus('running');
    const r = calculateAsteroidImpact(asteroid, asteroid.diameter, impactAngle, targetMaterial);
    setResults(r);
    setZonePopulationEstimate(null);
    setTimeout(() => {
      setSimulationStatus('completed');
      if (isMobile) setSheetOpen(true);
    }, 2600);
  }, [location, asteroid, impactAngle, targetMaterial, setSimulationStatus, setResults, isMobile]);

  const handleReset = useCallback(() => {
    setSimulationStatus('idle');
    setResults(null);
    setZonePopulationEstimate(null);
    if (isMobile) setSheetOpen(false);
  }, [setSimulationStatus, setResults, isMobile]);

  const handleShare = useCallback(() => {
    const url = urlWithZonePopulationEstimate(window.location.href, zonePopulationEstimate);
    if (navigator.share) {
      navigator.share({ title: `What if ${asteroid?.name} hit ${location?.name}?`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, [asteroid, location, zonePopulationEstimate]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 3) { setSearchError('Type at least 3 letters.'); return; }
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error ?? 'Search failed.'); setSearchResults([]); return; }
      setSearchResults(data.results ?? []);
      if (!data.results?.length) setSearchError('No results — try another name.');
    } catch {
      setSearchError('Could not connect.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleEstimatePopulationDensity = async () => {
    if (!location || !results) return;
    const populationRadii = populationRadiiToQuery(results);
    const radiusKm = Math.max(
      populationRadii.crater,
      populationRadii.fireball,
      populationRadii.blast,
      populationRadii.minorBlast,
      populationRadii.thermal,
    );
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
      radiusKm: String(radiusKm),
      craterKm: String(populationRadii.crater),
      fireballKm: String(populationRadii.fireball),
      blastKm: String(populationRadii.blast),
      minorBlastKm: String(populationRadii.minorBlast),
      thermalKm: String(populationRadii.thermal),
      uncertaintyFactor: String(results.uncertaintyFactor),
    });

    setPopulationEstimateStatus('loading');
    setPopulationEstimateError(null);
    try {
      const res = await fetch(`/api/population/worldpop?${params.toString()}`);
      const data = (await res.json()) as PopulationEstimateResponse | { error?: string };
      if (!res.ok || !('densityPerKm2' in data)) {
        throw new Error('error' in data ? data.error : 'Population estimate failed.');
      }
      if (data.zonePopulations && data.lowZonePopulations && data.highZonePopulations) {
        setZonePopulationEstimate({
          central: data.zonePopulations,
          low: data.lowZonePopulations,
          high: data.highZonePopulations,
        });
      } else {
        setZonePopulationEstimate(null);
      }
      setCustomDensityPerKm2(Math.round(data.densityPerKm2), {
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
        year: data.year,
        radiusKm: data.radiusKm,
        totalPopulation: data.totalPopulation,
        areaKm2: data.areaKm2,
        note: data.note,
      });
      setPopulationEstimateStatus('idle');
    } catch {
      setZonePopulationEstimate(null);
      setPopulationEstimateStatus('error');
      setPopulationEstimateError('WorldPop estimate unavailable. Use a census or gridded-population value manually.');
    }
  };

  const pickCity = (cityId: string) => {
    setSelectedCityId(cityId);
    const city = MAJOR_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    setLocation({ lng: city.lng, lat: city.lat, name: `${city.name}, ${city.country}` });
    setSearchResults([]);
    setSearchError(null);
    // gently nudge toward step 2
    setTimeout(() => asteroidAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const pickAsteroid = useCallback((a: Asteroid) => setAsteroid(a), [setAsteroid]);

  const density = customDensityPerKm2 ?? DENSITY_PRESETS[densityPreset].value;
  const diameterImpactRange = useMemo(
    () => estimateDiameterImpactRange(asteroid, impactAngle, targetMaterial),
    [asteroid, impactAngle, targetMaterial],
  );
  const casualties = results && asteroid
    ? zonePopulationEstimate
      ? hasDiameterRange(asteroid)
        ? mergeCasualtyRangeWithDiameterFallback(
            estimateCasualtiesFromZonePopulations(zonePopulationEstimate.central, zonePopulationEstimate.low, zonePopulationEstimate.high),
            estimateDisplayCasualties(results, asteroid, density, impactAngle, targetMaterial),
          )
        : estimateCasualtiesFromZonePopulations(zonePopulationEstimate.central, zonePopulationEstimate.low, zonePopulationEstimate.high)
      : estimateDisplayCasualties(results, asteroid, density, impactAngle, targetMaterial)
    : null;
  const severity = results ? (SEVERITY[results.severity] ?? SEVERITY.moderate) : null;

  // ── The one button that's always visible. It always names the next step. ─────
  const cta = useMemo(() => {
    if (isRunning) return { label: 'Incoming…', sub: '', mode: 'running' as const };
    if (isCompleted) return { label: 'Try another', sub: '', mode: 'reset' as const };
    if (!location) return { label: 'Pick a place to start', sub: 'Step 1 of 2', mode: 'guide-loc' as const };
    if (!asteroid) return { label: 'Now pick an asteroid', sub: 'Step 2 of 2', mode: 'guide-ast' as const };
    return { label: 'Simulate the impact', sub: `${asteroid.name} → ${location.name.split(',')[0]}`, mode: 'go' as const };
  }, [isRunning, isCompleted, location, asteroid]);

  const onCta = useCallback(() => {
    switch (cta.mode) {
      case 'go': handleSimulate(); break;
      case 'reset': handleReset(); break;
      case 'guide-loc':
        if (isMobile) setSheetOpen(true);
        else scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'guide-ast':
        if (isMobile) setSheetOpen(true);
        else asteroidAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
    }
  }, [cta.mode, handleSimulate, handleReset, isMobile]);

  // ── Reusable bits ─────────────────────────────────────────────────────────────

  const LocationCard = (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-white">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-500/15 text-[11px] font-bold text-orange-300">1</span>
        Where should it hit?
      </h2>

      {location && (
        <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-orange-500/25 bg-orange-500/8 px-3 py-2.5">
          <span className="text-lg">📍</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-white">{location.name}</p>
            <p className="font-mono text-[11px] text-orange-300/80">{location.lat.toFixed(3)}°, {location.lng.toFixed(3)}°</p>
          </div>
        </div>
      )}

      <div className="relative">
        <select
          aria-label="Choose a city"
          value={selectedCityId}
          onChange={(e) => pickCity(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 pr-9 text-[15px] text-white outline-none transition focus:border-orange-500/60"
          style={{ fontSize: '16px' }}
        >
          <option value="">Choose a city…</option>
          {MAJOR_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.country}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>

      <form onSubmit={handleSearch} className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Search for a place"
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="…or search any place on Earth"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-9 pr-3 text-[15px] text-white outline-none placeholder:text-slate-500 focus:border-orange-500/60"
            style={{ fontSize: '16px' }}
          />
        </div>
        <button type="submit" disabled={isSearching}
          className="press-feedback rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 text-[14px] font-semibold text-orange-200 hover:bg-orange-500/25 disabled:opacity-50">
          Go
        </button>
      </form>
      {searchError && <p role="status" aria-live="polite" className="mt-1.5 text-[12px] text-amber-300">{searchError}</p>}
      {searchResults.length > 0 && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-white/10">
          {searchResults.map((r) => (
            <button key={r.id} type="button"
              onClick={() => { setLocation({ lng: r.lng, lat: r.lat, name: r.placeName }); setSearchResults([]); setSearchError(null); setSearchQuery(''); setTimeout(() => asteroidAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }}
              className="press-feedback flex w-full items-center border-b border-white/5 px-4 py-3 text-left text-[14px] text-slate-300 last:border-0 hover:bg-orange-500/10 hover:text-white">
              {r.placeName}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-center text-[12px] text-slate-500">or just tap anywhere on the map 👆</p>
    </section>
  );

  const AsteroidCard = (
    <section ref={asteroidAnchorRef}>
      <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-white">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-500/15 text-[11px] font-bold text-orange-300">2</span>
        Which asteroid?
      </h2>

      <div className="space-y-3">
        {(Object.entries(KNOWN_ASTEROID_CATEGORIES) as [KnownAsteroidCategory, typeof KNOWN_ASTEROID_CATEGORIES[KnownAsteroidCategory]][]).map(([catKey, cat]) => (
          <div key={catKey}>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-400">{cat.emoji} {cat.label}</p>
            <div className="space-y-1.5">
              {cat.items.map((a) => {
                const selected = asteroid?.id === a.id;
                return (
                  <button key={a.id} type="button" aria-pressed={selected} onClick={() => pickAsteroid(a as Asteroid)}
                    className={`press-feedback w-full rounded-xl border p-3 text-left transition-all ${
                      selected ? 'border-orange-400/60 bg-orange-500/12 ring-1 ring-orange-400/30'
                               : 'border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.04]'}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl leading-none">{a.emoji ?? '☄️'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-white">{a.name}</p>
                          {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-orange-300" />}
                        </div>
                        <p className="mt-0.5 text-[12.5px] leading-snug text-slate-400">{a.blurb}</p>
                        <p className="mt-1 text-[11.5px] text-slate-500">
                          {a.diameter >= 1000 ? `${(a.diameter / 1000).toFixed(1)} km wide` : `${a.diameter} m wide`}
                          {' · '}{velocityLabel(a)}
                          {a.date ? ` · ${a.date}` : ''}
                        </p>
                        {a.velocity < MIN_NATURAL_IMPACT_VELOCITY_KM_S && (
                          <p className="mt-0.5 text-[10.5px] text-slate-600">
                            Flyby speed: {a.velocity.toFixed(1)} km/s; modeled impact entry adds Earth-gravity focusing.
                          </p>
                        )}
                        {a.compositionAssumed && (
                          <p className="mt-0.5 text-[10.5px] text-slate-600">
                            Material is a modeling assumption for mass and energy.
                          </p>
                        )}
                        {a.inputUncertainty && (
                          <p className="mt-0.5 text-[10.5px] leading-snug text-slate-600">
                            {a.inputUncertainty}
                          </p>
                        )}
                        {a.sourceName && (
                          <p className="mt-0.5 text-[10px] text-slate-700">Source: {a.sourceName}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-slate-400">🛰️ NASA/JPL close approaches</p>
          <div className="space-y-1.5">
            {isLoadingAsteroids && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[12.5px] text-slate-500">
                Loading current close-approach records…
              </div>
            )}
            {!isLoadingAsteroids && liveAsteroids.length === 0 && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[12.5px] text-slate-500">
                No current NASA/JPL records loaded.
              </div>
            )}
            {liveAsteroids.map((a) => {
              const selected = asteroid?.id === a.id;
              return (
                <button key={`${a.source}-${a.id}-${a.dateIso ?? a.date}`} type="button" aria-pressed={selected} onClick={() => pickAsteroid(a)}
                  className={`press-feedback w-full rounded-xl border p-3 text-left transition-all ${
                    selected ? 'border-orange-400/60 bg-orange-500/12 ring-1 ring-orange-400/30'
                             : 'border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.04]'}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none">🛰️</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-white">{a.name}</p>
                        {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-orange-300" />}
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-slate-400">
                        {a.relativeTime ?? a.date ?? 'Close approach'} · misses by {a.missDistance ?? 'unknown distance'}
                      </p>
                      {(a.missDistanceRange || a.approachTimeUncertainty) && (
                        <p className="mt-0.5 text-[10.5px] text-slate-600">
                          {a.missDistanceRange ? `3-sigma distance range: ${a.missDistanceRange}` : 'Distance uncertainty not supplied'}
                          {a.approachTimeUncertainty ? ` · time uncertainty: ${a.approachTimeUncertainty}` : ''}
                        </p>
                      )}
                      <p className="mt-1 text-[11.5px] text-slate-500">
                        {asteroidDiameterLabel(a)}
                        {' · '}{velocityLabel(a)}
                      </p>
                      {a.diameterEstimated && (
                        <p className="mt-0.5 text-[10.5px] text-slate-600">
                          Diameter estimated from brightness; simulation uses the midpoint estimate.
                        </p>
                      )}
                      {a.compositionAssumed && (
                        <p className="mt-0.5 text-[10.5px] text-slate-600">
                          Composition is not in CAD; mass and energy use a size-based material assumption.
                        </p>
                      )}
                      {a.inputUncertainty && (
                        <p className="mt-0.5 text-[10.5px] leading-snug text-slate-600">
                          {a.inputUncertainty}
                        </p>
                      )}
                      {a.sourceName && (
                        <p className="mt-0.5 text-[10px] text-slate-700">Source: {a.sourceName}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {liveAsteroidNote && <p className="mt-1.5 text-[10.5px] leading-snug text-slate-600">{liveAsteroidNote}</p>}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-semibold text-white">Impact angle</p>
          <p className="font-mono text-[12px] text-slate-400">{impactAngle}°</p>
        </div>
        <input
          type="range"
          min={10}
          max={90}
          step={1}
          value={impactAngle}
          onChange={(e) => setImpactAngle(Number(e.target.value))}
          className="w-full accent-orange-500"
          aria-label="Impact angle from horizontal"
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-slate-500">
          <span>shallow</span>
          <span>vertical</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="mb-2">
          <p className="text-[13px] font-semibold text-white">Target material</p>
          <p className="text-[10.5px] text-slate-500">Changes crater sizing for the selected surface</p>
        </div>
        <div className="relative">
          <select
            value={targetMaterial}
            onChange={(e) => setTargetMaterial(e.target.value as TargetMaterial)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 pr-9 text-[14px] text-white outline-none transition focus:border-orange-500/60"
            aria-label="Target material"
          >
            {(Object.keys(TARGET_MATERIAL_LABELS) as TargetMaterial[]).map((key) => (
              <option key={key} value={key}>{TARGET_MATERIAL_LABELS[key].label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
        <p className="mt-1.5 text-[10.5px] text-slate-500">{TARGET_MATERIAL_LABELS[targetMaterial].sublabel}</p>
      </div>
    </section>
  );

  const ResultsContent = results && casualties && severity && location && asteroid ? (
    <section className="space-y-4">
      {/* Verdict */}
      <div className={`rounded-2xl border p-4 ${severity.ring}`}>
        <p className="text-[12px] font-medium text-slate-300">If {asteroid.name} hit {location.name.split(',')[0]}…</p>
        <p className="mt-1 flex items-center gap-2 text-[22px] font-bold leading-tight text-white">
          <span>{severity.emoji}</span>
          <span className={severity.color}>{severity.label}</span>
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-300">{severity.desc}</p>
        {results.eventType === 'airburst' && (
          <p className="mt-2 text-[12px] leading-relaxed text-orange-200/80">
            Likely airburst around {formatDist(results.burstAltitude)} up; crater-forming effects are suppressed.
          </p>
        )}
      </div>

      {/* The boom */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[12px] font-medium text-slate-400">💥 Modeled kinetic energy equivalent</p>
        <p className="mt-1 text-[28px] font-black leading-none text-orange-300">
          {hiroshimaLabel(results.energyMt, asteroid, diameterImpactRange)} <span className="text-[18px] font-bold text-orange-200/80">Hiroshima yields</span>
        </p>
        <p className="mt-1.5 text-[12px] text-slate-500">
          ({energyLabel(results.energyMt, asteroid, diameterImpactRange)}; not all energy becomes ground-level blast)
        </p>
      </div>

      {/* People */}
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-white">👥 Scenario exposure</p>
        <p className="mb-2 text-[12px] leading-relaxed text-slate-500">
          Choose a uniform population density, or enter a local value from a census or gridded-population source. This is not live census data for {location.name.split(',')[0]}.
        </p>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(DENSITY_PRESETS) as DensityPreset[]).map((key) => (
            <button key={key} type="button" aria-pressed={customDensityPerKm2 === null && densityPreset === key} onClick={() => { setDensityPreset(key); setCustomDensityPerKm2(null); setZonePopulationEstimate(null); }}
              className={`press-feedback rounded-xl border px-2.5 py-2.5 text-left transition ${
                customDensityPerKm2 === null && densityPreset === key ? 'border-orange-500/50 bg-orange-500/12' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
              <p className={`text-[13px] font-semibold ${customDensityPerKm2 === null && densityPreset === key ? 'text-orange-200' : 'text-slate-300'}`}>{DENSITY_PRESETS[key].label}</p>
              <p className="text-[10.5px] text-slate-500">{DENSITY_PRESETS[key].sublabel}</p>
            </button>
          ))}
        </div>
        <label className={`mb-2 block rounded-xl border px-3 py-2.5 ${
          customDensityPerKm2 !== null ? 'border-orange-500/50 bg-orange-500/12' : 'border-white/8 bg-white/[0.02]'
        }`}>
          <span className={`block text-[13px] font-semibold ${customDensityPerKm2 !== null ? 'text-orange-200' : 'text-slate-300'}`}>
            Custom density
          </span>
          <span className="mb-1 block text-[10.5px] text-slate-500">people/km²; use local census, WorldPop, Kontur, or GPW when available</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="1000000"
            step="1"
            value={customDensityPerKm2 ?? ''}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              const next = Number(raw);
              setZonePopulationEstimate(null);
              setCustomDensityPerKm2(raw === '' || !Number.isFinite(next) ? null : next);
            }}
            placeholder={`${DENSITY_PRESETS[densityPreset].value}`}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-[13px] text-white outline-none transition placeholder:text-slate-700 focus:border-orange-400/60"
          />
        </label>
        <button
          type="button"
          onClick={handleEstimatePopulationDensity}
          disabled={populationEstimateStatus === 'loading'}
          className="press-feedback mb-2 w-full rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-60"
        >
          <span className="block text-[13px] font-semibold text-slate-300">
            {populationEstimateStatus === 'loading' ? 'Estimating WorldPop density...' : 'Use WorldPop footprint density'}
          </span>
          <span className="block text-[10.5px] leading-snug text-slate-500">
            Estimates residential population for the complete modeled footprint, then applies its average density across effect rings.
          </span>
        </button>
        {customDensitySource && (
          <p className="mb-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2 text-[10.5px] leading-snug text-orange-100/80">
            Using {customDensitySource.sourceName} {customDensitySource.year}: {formatBig(customDensitySource.totalPopulation)} people across {formatBig(customDensitySource.areaKm2)} km²{zonePopulationEstimate ? ', allocated by effect ring' : ''}.
          </p>
        )}
        {populationEstimateError && (
          <p className="mb-2 text-[10.5px] leading-snug text-red-300/80">{populationEstimateError}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 text-center">
            <p className="text-[11px] font-medium text-sky-200/80">Modeled exposed population</p>
            <p className="mt-0.5 text-[20px] font-black text-sky-200">{formatRange(casualties.totalExposedLow, casualties.totalExposedHigh)}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-center">
            <p className="text-[11px] font-medium text-red-300/80">Illustrative fatality range</p>
            <p className="mt-0.5 text-[20px] font-black text-red-300">{formatRange(casualties.totalDeathsLow, casualties.totalDeathsHigh)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-center">
            <p className="text-[11px] font-medium text-amber-300/80">Illustrative injury range</p>
            <p className="mt-0.5 text-[20px] font-black text-amber-300">{formatRange(casualties.totalInjuriesLow, casualties.totalInjuriesHigh)}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-center">
            <p className="text-[11px] font-medium text-emerald-200/80">Modeled uninjured survivors inside zones</p>
            <p className="mt-0.5 text-[20px] font-black text-emerald-200">{formatRange(casualties.totalSurvivorsLow, casualties.totalSurvivorsHigh)}</p>
          </div>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-slate-600">
          Ranges combine mapped-radius uncertainty{diameterUncertaintyPhrase(asteroid)} with heuristic vulnerability rates and {zonePopulationEstimate ? 'WorldPop population estimates for each effect ring' : `an assumption that ${formatBig(density)} people/km² are evenly spread across each effect zone`}. They are screening scenarios, not casualty forecasts. Real losses depend on shelter, building stock, time of day, terrain, weather, local response, and whether the selected target material matches the real surface.
          {targetMaterial === 'water' ? ' Tsunami, water depth, and coastal run-up are not modeled.' : ''}
        </p>
      </div>

      {/* Damage zones */}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-white">🎯 How far the damage spreads</p>
        <div className="space-y-1.5">
          {[
            { emoji: '🕳️', label: targetMaterial === 'water' ? 'Water cavity' : 'The crater', desc: craterZoneDescription(targetMaterial), r: results.craterDiameter / 2, color: '#FF3B1F' },
            { emoji: '🔥', label: 'Fireball', desc: 'Extreme thermal exposure zone', r: results.fireballRadius, color: '#FF6B2C' },
            { emoji: '💨', label: 'Shockwave', desc: 'About 4 psi overpressure', r: results.blastRadius, color: '#FF9F1C' },
            { emoji: '🪟', label: 'Window damage', desc: 'Broken-glass injury zone', r: results.minorBlastRadius, color: '#8BD3FF' },
            { emoji: '🌡️', label: 'Thermal exposure', desc: 'Severe-burn screening zone', r: results.thermalRadius, color: '#FFD23F' },
          ].filter((z) => z.r > 0).map((z) => (
            <div key={z.label} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ background: `${z.color}1a` }}>{z.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-white">{z.label}</span>
                  <span className="font-mono text-[12px] text-slate-400">{formatDist(z.r)} out</span>
                </div>
                <p className="text-[11.5px] text-slate-500">{z.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fun facts */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Crater size</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">
            {results.eventType === 'airburst' ? 'None expected' : `${formatDist(results.craterDiameter)} wide`}
          </p>
          <p className="text-[10.5px] text-slate-500">
            {results.eventType === 'airburst' ? 'no excavated crater expected' : craterSummary(targetMaterial, results.craterDiameter)}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Ground shaking</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">
            {results.eventType === 'airburst' ? 'Minimal' : `Magnitude ${results.seismicMagnitude.toFixed(1)}`}
          </p>
          <p className="text-[10.5px] text-slate-500">
            {results.eventType === 'airburst' ? 'no crater-forming impact' : 'seismic energy equivalent, not a tectonic quake'}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">{results.eventType === 'airburst' ? 'Speed at burst' : 'Speed at impact'}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{results.impactVelocity.toFixed(0)} km/s</p>
          <p className="text-[10.5px] text-slate-500">modeled atmospheric-entry speed</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Global frequency</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{formatRecurrence(results.recurrenceYears)}</p>
          <p className="text-[10.5px] text-slate-500">for this size or larger</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Impactor mass</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{massLabel(results.massKg, asteroid)}</p>
          <p className="text-[10.5px] text-slate-500">assuming {massAssumptionLabel(asteroid)}</p>
        </div>
      </div>

      <button type="button" onClick={handleShare}
        className="press-feedback flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] py-3 text-[14px] font-semibold text-white hover:bg-white/[0.08]">
        {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Link copied!' : 'Share this impact'}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-slate-600">
        Target material: {TARGET_MATERIAL_LABELS[targetMaterial].label}. {targetMaterial === 'water' ? 'Tsunami, water depth, and coastal run-up are outside this model. ' : ''}{results.uncertaintyNote} Treat mapped radii as roughly ±{results.uncertaintyFactor}x screening estimates, not exact boundaries.
      </p>
    </section>
  ) : null;

  // The big persistent button (shared desktop + mobile)
  const BigButton = (
    <button type="button" onClick={onCta} disabled={isRunning}
      className={`press-feedback w-full rounded-2xl px-4 py-3.5 text-center transition-all ${
        cta.mode === 'go' ? 'impact-btn-active text-white'
        : cta.mode === 'reset' ? 'border border-white/14 bg-white/[0.06] text-white hover:bg-white/[0.1]'
        : cta.mode === 'running' ? 'cursor-default bg-orange-600/30 text-orange-200'
        : 'border border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/16'}`}>
      <span className="flex items-center justify-center gap-2 text-[16px] font-bold">
        {cta.mode === 'go' && <Play className="h-5 w-5 fill-current" />}
        {cta.mode === 'reset' && <RotateCcw className="h-4 w-4" />}
        {cta.mode === 'go' ? '💥 ' : ''}{cta.label}
      </span>
      {cta.sub && <span className="mt-0.5 block truncate text-[11.5px] font-medium opacity-70">{cta.sub}</span>}
    </button>
  );

  const RunningOverlay = isRunning ? (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#07080f]/70 backdrop-blur-sm">
      <div className="glass animate-impact-flash rounded-2xl px-10 py-8 text-center">
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <div className="animate-target-ring absolute inset-0 rounded-full border-2 border-red-500/60" />
          <div className="animate-target-ring absolute inset-0 rounded-full border border-orange-400/40" style={{ animationDelay: '0.6s' }} />
          <div className="relative h-6 w-6 rounded-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.9)]">
            <div className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />
          </div>
        </div>
        <h2 className="text-[20px] font-black text-orange-300">💥 Impact!</h2>
        <p className="mt-1 text-[13px] text-slate-400">Working out the damage…</p>
      </div>
    </div>
  ) : null;

  const Logo = (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-orange-500/30 to-red-600/20 text-base">☄️</div>
      <div>
        <h1 className="text-[15px] font-bold leading-none text-white">Asteroid Map</h1>
        <p className="mt-0.5 text-[11px] leading-none text-slate-500">Drop a space rock anywhere</p>
      </div>
    </div>
  );

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#07080f]">
        <header className="z-40 flex shrink-0 items-center border-b border-white/[0.07] bg-[#07080f]/90 px-4"
          style={{ height: 'calc(54px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}>
          {Logo}
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <DirectoryMap />
          {RunningOverlay}

          {/* Bottom panel — the action button is ALWAYS at the bottom, always visible */}
          <div className="absolute inset-x-0 bottom-0 z-40 flex max-h-[72dvh] flex-col rounded-t-3xl border-t border-white/12 bg-[#0a0e1a]/97 backdrop-blur-xl"
            style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.55)' }}>
            {/* Expandable content */}
            {sheetOpen && (
              <>
                <button type="button" onClick={() => setSheetOpen(false)} className="flex shrink-0 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium text-slate-400">
                  <ChevronDown className="h-4 w-4" /> Tap to minimize
                </button>
                <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-3">
                  {isCompleted ? ResultsContent : (<>{LocationCard}{AsteroidCard}</>)}
                </div>
              </>
            )}

            {/* Collapsed handle — tap to open pickers */}
            {!sheetOpen && (
              <button type="button" onClick={() => setSheetOpen(true)} className="flex shrink-0 items-center gap-3 px-4 pb-1 pt-3">
                <span className="text-xl">{asteroid?.emoji ?? '☄️'}</span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13.5px] font-semibold text-white">
                    {isCompleted ? 'See the full results' : !location ? 'Pick a target city' : !asteroid ? 'Pick an asteroid' : `${asteroid.name} → ${location.name.split(',')[0]}`}
                  </p>
                  <p className="truncate text-[11.5px] text-slate-500">{isCompleted ? 'Tap to expand' : location && !isCompleted ? location.name : 'Tap to choose'}</p>
                </div>
                <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" />
              </button>
            )}

            {/* The button bar — never hidden */}
            <div className="shrink-0 px-4 pt-2.5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
              {BigButton}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#07080f]">
      <header className="z-40 flex h-14 shrink-0 items-center gap-4 border-b border-white/[0.07] px-5">
        {Logo}
        <span className="ml-1 hidden text-[12.5px] text-slate-500 lg:block">What happens if an asteroid hits your city? Find out 👇</span>
        {isCompleted && (
          <button type="button" onClick={handleShare}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.08]">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        )}
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="z-20 flex w-[380px] shrink-0 flex-col border-r border-white/[0.07] bg-[#080b14]">
          <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            {isCompleted ? ResultsContent : (<>{LocationCard}{AsteroidCard}</>)}
          </div>
          {/* Pinned action bar — never scrolls away */}
          <div className="shrink-0 border-t border-white/[0.08] bg-[#080b14] p-4">
            {BigButton}
          </div>
        </aside>

        <main className="relative flex-1 overflow-hidden">
          <DirectoryMap />
          {RunningOverlay}
        </main>
      </div>
    </div>
  );
}
