'use client';

import { useEffect, useState, useMemo, useCallback, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { Drawer } from 'vaul';
import { useAppStore, hydrateFromUrl, DENSITY_PRESETS, type DensityPreset } from '@/lib/store';
import type { Asteroid } from '@/lib/store';
import { calculateImpact, estimateCasualties, ASTEROID_DENSITIES, TARGET_DENSITIES } from '@/lib/physics';
import { KNOWN_ASTEROID_CATEGORIES, type KnownAsteroidCategory } from '@/lib/known-asteroids';
import { MAJOR_CITIES } from '@/lib/major-cities';
import { Play, Share2, Check, Search, ChevronDown, RotateCcw, MapPin, Rocket, BarChart3 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const DirectoryMap = dynamic(() => import('@/components/DirectoryMap'), { ssr: false });

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBig(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return Math.round(n).toLocaleString();
}

function formatDist(m: number): string {
  if (m >= 1_000_000) return `${(m / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} km`;
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatMegatons(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 10) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  if (n >= 0.01) return n.toFixed(2);
  return n.toFixed(4);
}

function sizeLabel(m: number): string {
  if (m < 5) return 'Car-sized';
  if (m < 20) return 'House-sized';
  if (m < 50) return 'Building-sized';
  if (m < 100) return 'Football field';
  if (m < 500) return 'Skyscraper-sized';
  if (m < 1000) return 'Mountain-sized';
  if (m < 15000) return 'Dino-killer class';
  return 'Planet-killer';
}

const SEVERITY: Record<string, { label: string; color: string; desc: string }> = {
  low:      { label: 'Small',       color: 'text-emerald-300', desc: 'Would mess up a neighborhood.' },
  moderate: { label: 'Big',         color: 'text-amber-300',   desc: 'Would flatten a whole city.' },
  high:     { label: 'Huge',        color: 'text-orange-300',  desc: 'Would destroy an entire country.' },
  extreme:  { label: 'Dino-Killer', color: 'text-red-300',     desc: 'This is the kind that wiped out the dinosaurs.' },
};

// ── All known asteroids flattened ────────────────────────────────────────────
const ALL_KNOWN = Object.entries(KNOWN_ASTEROID_CATEGORIES).flatMap(([catKey, cat]) =>
  cat.items.map((a) => ({ ...a, _cat: catKey as KnownAsteroidCategory, _catLabel: cat.label }))
);

const UNIQUE_ASTEROIDS = (() => {
  const seen = new Set<string>();
  return ALL_KNOWN.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
})();

// ── Mobile step types ────────────────────────────────────────────────────────
type MobileStep = 'location' | 'asteroid' | 'results';

// ── Component ──────────────────────────────────────────────────────────────────

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

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; placeName: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [asteroidFilter, setAsteroidFilter] = useState('');

  // Mobile state
  const isMobile = useIsMobile();
  const [mobileStep, setMobileStep] = useState<MobileStep>('location');
  const [snapPoint, setSnapPoint] = useState<number | string | null>(0.16);

  // Hydrate from URL on first load
  useEffect(() => { hydrateFromUrl(); }, []);

  // Auto-advance step on mobile when location is set via map tap
  useEffect(() => {
    if (!isMobile || !location) return;
    if (mobileStep === 'location') {
      setTimeout(() => {
        setMobileStep('asteroid');
        setSnapPoint(0.16);
      }, 350);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, isMobile]);

  const canSimulate = Boolean(location && asteroid);
  const isCompleted = simulationStatus === 'completed';

  const handleSimulate = useCallback(() => {
    if (!location || !asteroid) return;
    setSimulationStatus('running');
    const r = calculateImpact({
      diameter: asteroid.diameter,
      velocity: asteroid.velocity,
      angle: 45,
      density: ASTEROID_DENSITIES[asteroid.composition],
      targetDensity: TARGET_DENSITIES.sedimentary,
    });
    setResults(r);
    setTimeout(() => {
      setSimulationStatus('completed');
      if (isMobile) {
        setMobileStep('results');
        setSnapPoint(0.55);
      }
    }, 2600);
  }, [location, asteroid, setSimulationStatus, setResults, isMobile]);

  const handleReset = useCallback(() => {
    setSimulationStatus('idle');
    setResults(null);
    if (isMobile) {
      setMobileStep('location');
      setSnapPoint(0.16);
    }
  }, [setSimulationStatus, setResults, isMobile]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `What if ${asteroid?.name} hit ${location?.name}?`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, [asteroid, location]);

  // City search
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

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);
    const city = MAJOR_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    setLocation({ lng: city.lng, lat: city.lat, name: `${city.name}, ${city.country}` });
    setSearchResults([]);
    setSearchError(null);
    if (isMobile) {
      setMobileStep('asteroid');
      setSnapPoint(0.16);
    }
  };

  const handleAsteroidSelect = useCallback((a: Asteroid) => {
    setAsteroid(a);
    if (isMobile) {
      setSnapPoint(0.16);
    }
  }, [setAsteroid, isMobile]);

  // Filtered asteroids
  const filteredAsteroids = useMemo(() => {
    if (!asteroidFilter) return UNIQUE_ASTEROIDS;
    const q = asteroidFilter.toLowerCase();
    return UNIQUE_ASTEROIDS.filter((a) => a.name.toLowerCase().includes(q));
  }, [asteroidFilter]);

  // Casualties
  const density = DENSITY_PRESETS[densityPreset].value;
  const casualties = results ? estimateCasualties(results, density) : null;
  const severity = results ? (SEVERITY[results.severity] ?? SEVERITY.moderate) : null;

  // ── Shared content sections ──────────────────────────────────────────────────

  const LocationSection = (
    <section>
      <label className="mb-2 block font-orbitron text-[9px] font-semibold tracking-[0.16em] text-cyan-300 uppercase">
        1. Where should it hit?
      </label>

      {location && (
        <div className="mb-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2.5">
          <p className="text-[13px] font-semibold text-white leading-tight">{location.name}</p>
          <p className="font-mono text-[10px] text-cyan-400 mt-0.5">{location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°</p>
        </div>
      )}

      <div className="relative">
        <select
          value={selectedCityId}
          onChange={(e) => handleCitySelect(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/8 bg-[rgba(5,7,18,0.65)] px-3 py-3 pr-8 text-white outline-none transition focus:border-violet-500/60"
          style={{ fontSize: '16px' }}
        >
          <option value="">Pick a famous city…</option>
          {MAJOR_CITIES.map((city) => (
            <option key={city.id} value={city.id}>{city.name}, {city.country}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>

      <form onSubmit={handleSearch} className="mt-2 flex gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Or search any place…"
            className="w-full rounded-xl border border-white/8 bg-[rgba(5,7,18,0.65)] py-3 pl-9 pr-3 text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60"
            style={{ fontSize: '16px' }}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="press-feedback rounded-xl border border-violet-500/40 bg-violet-600/25 px-4 py-3 text-[13px] font-semibold text-violet-200 hover:bg-violet-600/40 disabled:opacity-50 min-w-[56px]"
        >
          Go
        </button>
      </form>
      {searchError && <p className="mt-1.5 text-[11px] text-amber-300">{searchError}</p>}
      {searchResults.length > 0 && (
        <div className="mt-1.5 rounded-xl border border-white/6 overflow-hidden">
          {searchResults.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setLocation({ lng: r.lng, lat: r.lat, name: r.placeName }); setSearchResults([]); setSearchError(null); setSearchQuery(''); if (isMobile) { setMobileStep('asteroid'); setSnapPoint(0.16); } }}
              className="press-feedback flex w-full items-center px-4 py-3.5 text-left text-[14px] text-slate-300 hover:bg-violet-500/10 hover:text-white border-b border-white/4 last:border-0 min-h-[44px]"
            >
              {r.placeName}
            </button>
          ))}
        </div>
      )}
      {!isMobile && <p className="mt-1.5 text-[9px] text-slate-600 text-center">or tap anywhere on the map</p>}
      {isMobile && <p className="mt-1.5 text-[11px] text-slate-600 text-center">or tap anywhere on the map</p>}
    </section>
  );

  const AsteroidSection = (
    <section>
      <label className="mb-2 block font-orbitron text-[9px] font-semibold tracking-[0.16em] text-amber-300 uppercase">
        2. Pick a space rock
      </label>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          value={asteroidFilter}
          onChange={(e) => setAsteroidFilter(e.target.value)}
          placeholder="Search asteroids…"
          className="w-full rounded-xl border border-white/8 bg-[rgba(5,7,18,0.65)] py-3 pl-9 pr-3 text-white outline-none placeholder:text-slate-600 focus:border-violet-500/60"
          style={{ fontSize: '16px' }}
        />
      </div>

      <div className="space-y-1.5">
        {(Object.entries(KNOWN_ASTEROID_CATEGORIES) as [KnownAsteroidCategory, typeof KNOWN_ASTEROID_CATEGORIES[KnownAsteroidCategory]][]).map(([catKey, cat]) => {
          const items = cat.items.filter((a) =>
            !asteroidFilter || a.name.toLowerCase().includes(asteroidFilter.toLowerCase())
          );
          if (items.length === 0) return null;
          return (
            <div key={catKey}>
              <p className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase mb-1 mt-2 first:mt-0">
                {cat.emoji} {cat.label}
              </p>
              {items.map((a) => (
                <button
                  key={`${catKey}-${a.id}`}
                  type="button"
                  onClick={() => handleAsteroidSelect(a as Asteroid)}
                  className={`press-feedback w-full rounded-xl border p-3 text-left transition-all mb-1 ${
                    asteroid?.id === a.id
                      ? 'border-violet-400/50 bg-violet-500/12'
                      : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-white leading-tight">{a.name}</p>
                    {a.isPotentiallyHazardous && (
                      <span className="shrink-0 rounded-full border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 font-orbitron text-[7px] tracking-widest text-red-300">DANGER</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    <span><span className="text-slate-600">Size </span>{a.diameter >= 1000 ? `${(a.diameter/1000).toFixed(1)} km` : `${a.diameter} m`}</span>
                    <span><span className="text-slate-600">Speed </span>{a.velocity} km/s</span>
                    <span className="text-slate-600 ml-auto">{sizeLabel(a.diameter)}</span>
                  </div>
                  {a.missDistance && (
                    <p className="mt-0.5 text-[10px] text-slate-500 truncate">Miss: {a.missDistance}</p>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );

  const ResultsSection = results && casualties && severity && location && asteroid ? (
    <section className="space-y-4">
      {/* Severity */}
      <div className={`rounded-xl border p-3.5 ${
        results.severity === 'extreme' ? 'border-red-500/40 bg-red-500/8' :
        results.severity === 'high' ? 'border-orange-500/40 bg-orange-500/8' :
        results.severity === 'moderate' ? 'border-amber-500/40 bg-amber-500/8' :
        'border-emerald-500/40 bg-emerald-500/8'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">How bad?</span>
          <span className={`font-orbitron text-[11px] font-bold tracking-wide uppercase ${severity.color}`}>{severity.label}</span>
        </div>
        <p className="text-[13px] text-slate-300 leading-relaxed">{severity.desc}</p>
      </div>

      {/* Explosion */}
      <div className="glass-inner rounded-xl p-3.5">
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase mb-1">Explosion</p>
        <p className="font-orbitron text-3xl font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent leading-none">
          {formatMegatons(results.energyMt)} <span className="text-lg">Mt</span>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {Math.round(results.energyMt / 0.015).toLocaleString()}x the Hiroshima bomb
        </p>
      </div>

      {/* Casualties */}
      <div>
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase mb-2">People affected</p>
        <div className="grid grid-cols-4 gap-1 mb-2">
          {(Object.keys(DENSITY_PRESETS) as DensityPreset[]).map((key) => (
            <button key={key} type="button" onClick={() => setDensityPreset(key)}
              className={`press-feedback rounded-lg border px-1.5 py-2 text-center transition text-[10px] min-h-[44px] ${
                densityPreset === key
                  ? 'border-violet-500/40 bg-violet-500/12 text-violet-200'
                  : 'border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300'
              }`}>
              <p className="font-semibold leading-tight">{DENSITY_PRESETS[key].label}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-inner rounded-xl p-3 text-center">
            <p className="font-orbitron text-[8px] tracking-widest text-red-400/70 uppercase mb-0.5">Deaths</p>
            <p className="font-orbitron text-xl font-black text-red-300">{formatBig(casualties.totalDeaths)}</p>
          </div>
          <div className="glass-inner rounded-xl p-3 text-center">
            <p className="font-orbitron text-[8px] tracking-widest text-amber-400/70 uppercase mb-0.5">Injured</p>
            <p className="font-orbitron text-xl font-black text-amber-300">{formatBig(casualties.totalInjuries)}</p>
          </div>
        </div>
      </div>

      {/* Destruction zones */}
      <div className="space-y-1.5">
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">Damage zones</p>
        {[
          { emoji: '🕳️', label: 'Crater', color: '#FF1A00', radius: results.craterDiameter / 2, desc: 'Everything vaporized' },
          { emoji: '🔥', label: 'Fireball', color: '#FF4400', radius: results.fireballRadius, desc: 'Everything catches fire' },
          { emoji: '💥', label: 'Shock wave', color: '#FF8800', radius: results.blastRadius, desc: 'Buildings knocked down' },
          { emoji: '🌡️', label: 'Burns', color: '#FFD600', radius: results.thermalRadius, desc: 'Burns skin at this distance' },
        ].map((zone) => (
          <div key={zone.label} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3 min-h-[52px]">
            <span className="text-xl">{zone.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white">{zone.label}</span>
                <span className="font-mono text-[11px] text-slate-400">{formatDist(zone.radius)}</span>
              </div>
              <p className="text-[10px] text-slate-500">{zone.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-inner rounded-xl p-3">
          <p className="text-[8px] font-orbitron tracking-widest text-slate-500 uppercase">Speed</p>
          <p className="font-mono text-[14px] font-semibold text-white mt-0.5">{results.impactVelocity.toFixed(1)} km/s</p>
        </div>
        <div className="glass-inner rounded-xl p-3">
          <p className="text-[8px] font-orbitron tracking-widest text-slate-500 uppercase">Earthquake</p>
          <p className="font-mono text-[14px] font-semibold text-white mt-0.5">M {results.seismicMagnitude.toFixed(1)}</p>
        </div>
        <div className="glass-inner rounded-xl p-3">
          <p className="text-[8px] font-orbitron tracking-widest text-slate-500 uppercase">Crater</p>
          <p className="font-mono text-[14px] font-semibold text-white mt-0.5">{formatDist(results.craterDiameter)} wide</p>
        </div>
        <div className="glass-inner rounded-xl p-3">
          <p className="text-[8px] font-orbitron tracking-widest text-slate-500 uppercase">Weight</p>
          <p className="font-mono text-[14px] font-semibold text-white mt-0.5">{formatBig(results.massKg)} kg</p>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center leading-relaxed">
        Based on real science (Collins et al. 2005) — for fun &amp; learning, not a real warning!
      </p>
    </section>
  ) : (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-[14px] text-slate-500">Run a simulation first to see results.</p>
    </div>
  );

  // ── MOBILE LAYOUT ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-[#07080f]">
        {/* ═══ MOBILE HEADER ═══ */}
        <header
          className="glass relative z-40 flex shrink-0 items-center border-b border-white/[0.07] px-4 gap-3"
          style={{
            height: 'calc(48px + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/25 bg-gradient-to-br from-red-600/20 to-orange-600/10">
              <span className="text-sm">☄️</span>
            </div>
            <p className="font-orbitron text-[11px] font-bold tracking-[0.12em] text-white">ASTEROID MAP</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isCompleted && (
              <>
                <button
                  type="button"
                  onClick={handleShare}
                  className="press-feedback flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-300 min-h-[36px]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Share'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="press-feedback flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-[11px] text-slate-400 min-h-[36px]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* ═══ MAP (full screen beneath the sheet) ═══ */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <DirectoryMap />

          {/* Running overlay */}
          {simulationStatus === 'running' && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#07080f]/65 backdrop-blur-sm">
              <div className="glass rounded-2xl px-10 py-8 text-center animate-impact-flash">
                <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                  <div className="animate-target-ring absolute inset-0 rounded-full border-2 border-red-500/60" />
                  <div className="animate-target-ring absolute inset-0 rounded-full border border-orange-400/40" style={{ animationDelay: '0.6s' }} />
                  <div className="relative h-6 w-6 rounded-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.9)]">
                    <div className="absolute inset-0 rounded-full bg-red-400/60 animate-ping" />
                  </div>
                </div>
                <h2 className="font-orbitron text-lg font-black tracking-[0.15em] text-red-300">INCOMING!</h2>
                <div className="my-2 flex justify-center gap-1">
                  <div className="dot-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
                  <div className="dot-2 h-1.5 w-1.5 rounded-full bg-orange-400" />
                  <div className="dot-3 h-1.5 w-1.5 rounded-full bg-orange-400" />
                </div>
                <p className="text-xs text-slate-500">Calculating crater, fireball, shockwave…</p>
              </div>
            </div>
          )}

          {/* ═══ BOTTOM SHEET (vaul) ═══ */}
          <Drawer.Root
            snapPoints={[0.16, 0.55, 0.92]}
            activeSnapPoint={snapPoint}
            setActiveSnapPoint={setSnapPoint}
            modal={false}
            open={true}
            onOpenChange={() => {}}
            dismissible={false}
            noBodyStyles
          >
            <Drawer.Portal>
              <Drawer.Content
                className="fixed bottom-0 left-0 right-0 z-40 flex flex-col outline-none"
                style={{
                  height: '100dvh',
                  background: 'rgba(7, 10, 22, 0.96)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px 20px 0 0',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
                }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-white/20" />
                </div>

                {/* ── Tab row (always visible) ── */}
                <div
                  className="shrink-0 flex items-center gap-1 px-3 pb-3 border-b border-white/[0.07]"
                  style={{ touchAction: 'none' }}
                >
                  {/* Step tabs */}
                  <div className="flex items-center gap-1 flex-1">
                    {([
                      { id: 'location' as MobileStep, icon: <MapPin className="h-4 w-4" />, label: 'Target', done: Boolean(location), disabled: false as boolean },
                      { id: 'asteroid' as MobileStep, icon: <Rocket className="h-4 w-4" />, label: 'Rock', done: Boolean(asteroid), disabled: false as boolean },
                      { id: 'results' as MobileStep, icon: <BarChart3 className="h-4 w-4" />, label: 'Results', done: isCompleted, disabled: !isCompleted as boolean },
                    ]).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (tab.disabled) return;
                          setMobileStep(tab.id);
                          setSnapPoint(0.55);
                        }}
                        disabled={tab.disabled}
                        className={`press-feedback flex flex-col items-center justify-center gap-0.5 flex-1 rounded-xl py-2 transition-all min-h-[52px] ${
                          mobileStep === tab.id
                            ? 'bg-white/8 border border-white/10 text-white'
                            : tab.disabled
                            ? 'text-slate-700 cursor-not-allowed'
                            : 'text-slate-400'
                        }`}
                      >
                        <span className={`${tab.done ? 'text-violet-300' : mobileStep === tab.id ? 'text-cyan-300' : ''}`}>
                          {tab.done ? '✓' : tab.icon}
                        </span>
                        <span className="text-[10px] font-medium">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Simulate / Reset button */}
                  <button
                    type="button"
                    onClick={isCompleted ? handleReset : handleSimulate}
                    disabled={!isCompleted && !canSimulate}
                    className={`press-feedback flex flex-col items-center justify-center gap-0.5 rounded-xl px-4 min-h-[52px] min-w-[72px] text-[11px] font-bold font-orbitron tracking-wide transition-all ${
                      isCompleted
                        ? 'border border-white/10 bg-white/6 text-slate-300'
                        : canSimulate
                        ? 'impact-btn-active text-white'
                        : 'bg-white/4 text-slate-600 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {isCompleted ? (
                      <><RotateCcw className="h-4 w-4 mb-0.5" /><span>Reset</span></>
                    ) : (
                      <><Play className="h-4 w-4 mb-0.5" /><span>{canSimulate ? 'GO!' : 'GO!'}</span></>
                    )}
                  </button>
                </div>

                {/* ── Scrollable content area ── */}
                <div
                  className="sheet-scroll flex-1 overflow-y-auto px-4 py-4"
                  style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
                >
                  {mobileStep === 'location' && LocationSection}
                  {mobileStep === 'asteroid' && AsteroidSection}
                  {mobileStep === 'results' && ResultsSection}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#07080f]">
      {/* ═══ HEADER ═══ */}
      <header className="glass relative z-40 flex h-12 shrink-0 items-center border-b border-white/[0.07] px-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/25 bg-gradient-to-br from-red-600/20 to-orange-600/10">
            <span className="text-sm">☄️</span>
          </div>
          <p className="font-orbitron text-[11px] font-bold tracking-[0.12em] text-white">ASTEROID MAP</p>
        </div>
        <span className="text-[10px] text-slate-600 hidden sm:block">What happens if a space rock hits your city?</span>
        <div className="ml-auto flex items-center gap-2">
          {isCompleted && (
            <>
              <button type="button" onClick={handleShare}
                className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-300 hover:bg-violet-500/20 transition">
                {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Share'}
              </button>
              <button type="button" onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] text-slate-400 hover:text-white transition">
                <RotateCcw className="h-3 w-3" /> New
              </button>
            </>
          )}
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className="glass relative z-20 flex w-[320px] shrink-0 flex-col overflow-hidden border-r border-white/[0.07]">
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-5">

            {/* ── 1. PICK A CITY ── */}
            {LocationSection}

            {/* ── 2. PICK AN ASTEROID ── */}
            {AsteroidSection}

            {/* ── SIMULATE BUTTON ── */}
            <button type="button" onClick={isCompleted ? handleReset : handleSimulate}
              disabled={!isCompleted && !canSimulate}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold font-orbitron tracking-[0.08em] transition-all ${
                isCompleted
                  ? 'border border-white/10 bg-white/6 text-slate-300 hover:bg-white/10'
                  : canSimulate
                  ? 'impact-btn-active text-white'
                  : 'bg-white/4 text-slate-600 cursor-not-allowed border border-white/5'
              }`}>
              {isCompleted ? (
                <><RotateCcw className="h-4 w-4" /> Try another one</>
              ) : (
                <><Play className="h-4 w-4" /> {canSimulate ? 'SIMULATE IMPACT' : 'Pick a city & asteroid first'}</>
              )}
            </button>

            {/* ── RESULTS ── */}
            {isCompleted && (
              <section className="animate-fadeInUp border-t border-white/6 pt-4">
                {ResultsSection}
              </section>
            )}
          </div>
        </aside>

        {/* ── MAP ── */}
        <main className="relative flex-1 overflow-hidden">
          <DirectoryMap />

          {/* Running overlay */}
          {simulationStatus === 'running' && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#07080f]/65 backdrop-blur-sm">
              <div className="glass rounded-2xl px-10 py-8 text-center animate-impact-flash">
                <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                  <div className="animate-target-ring absolute inset-0 rounded-full border-2 border-red-500/60" />
                  <div className="animate-target-ring absolute inset-0 rounded-full border border-orange-400/40" style={{ animationDelay: '0.6s' }} />
                  <div className="relative h-6 w-6 rounded-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.9)]">
                    <div className="absolute inset-0 rounded-full bg-red-400/60 animate-ping" />
                  </div>
                </div>
                <h2 className="font-orbitron text-lg font-black tracking-[0.15em] text-red-300">INCOMING!</h2>
                <div className="my-2 flex justify-center gap-1">
                  <div className="dot-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
                  <div className="dot-2 h-1.5 w-1.5 rounded-full bg-orange-400" />
                  <div className="dot-3 h-1.5 w-1.5 rounded-full bg-orange-400" />
                </div>
                <p className="text-xs text-slate-500">Calculating crater, fireball, shockwave…</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
