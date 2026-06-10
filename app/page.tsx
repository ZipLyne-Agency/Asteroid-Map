'use client';

import { useEffect, useRef, useState, useMemo, useCallback, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore, hydrateFromUrl, DENSITY_PRESETS, type DensityPreset } from '@/lib/store';
import type { Asteroid } from '@/lib/store';
import { calculateImpact, estimateCasualties, ASTEROID_DENSITIES, TARGET_DENSITIES } from '@/lib/physics';
import { KNOWN_ASTEROID_CATEGORIES, type KnownAsteroidCategory } from '@/lib/known-asteroids';
import { MAJOR_CITIES } from '@/lib/major-cities';
import { Play, Share2, Check, Search, ChevronDown, RotateCcw, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const DirectoryMap = dynamic(() => import('@/components/DirectoryMap'), { ssr: false });

// ── Plain-English formatting ─────────────────────────────────────────────────

function formatBig(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)},000`;
  return Math.round(n).toLocaleString();
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 100000 ? 0 : 1)} km`;
  return `${Math.round(m)} m`;
}

/** Energy in "Hiroshima bombs" — the comparison everyone understands. */
function hiroshimas(energyMt: number): string {
  const n = energyMt / 0.015; // Hiroshima ≈ 15 kilotons
  if (n < 1) return 'less than one';
  return formatBig(n);
}

/** Crater width in a relatable unit. */
function craterCompare(m: number): string {
  if (m < 100) return 'about the size of a soccer field';
  const fields = Math.round(m / 105); // football field ≈ 105 m
  if (fields < 60) return `as wide as ${fields} football fields`;
  return `wider than most cities`;
}

const SEVERITY: Record<string, { label: string; emoji: string; color: string; ring: string; desc: string }> = {
  low: {
    label: 'A local scare', emoji: '😮', color: 'text-emerald-300', ring: 'border-emerald-500/40 bg-emerald-500/10',
    desc: 'Enough to wreck a few blocks and break a lot of windows.',
  },
  moderate: {
    label: 'A city-flattener', emoji: '😨', color: 'text-amber-300', ring: 'border-amber-500/40 bg-amber-500/10',
    desc: 'This could level a whole city. Everyone for miles would feel it.',
  },
  high: {
    label: 'A country-wrecker', emoji: '😱', color: 'text-orange-300', ring: 'border-orange-500/40 bg-orange-500/10',
    desc: 'Damage on the scale of an entire region or small country.',
  },
  extreme: {
    label: 'A dinosaur-killer', emoji: '🦕', color: 'text-red-300', ring: 'border-red-500/50 bg-red-500/12',
    desc: 'This is the kind of impact that ended the age of the dinosaurs.',
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

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; placeName: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState('');

  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false); // mobile: is the picker/results sheet expanded
  const scrollRef = useRef<HTMLDivElement>(null);
  const asteroidAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { hydrateFromUrl(); }, []);

  const canSimulate = Boolean(location && asteroid);
  const isCompleted = simulationStatus === 'completed';
  const isRunning = simulationStatus === 'running';

  // ── Actions ──────────────────────────────────────────────────────────────────
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
      if (isMobile) setSheetOpen(true);
    }, 2600);
  }, [location, asteroid, setSimulationStatus, setResults, isMobile]);

  const handleReset = useCallback(() => {
    setSimulationStatus('idle');
    setResults(null);
    if (isMobile) setSheetOpen(false);
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

  const density = DENSITY_PRESETS[densityPreset].value;
  const casualties = results ? estimateCasualties(results, density) : null;
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
      {searchError && <p className="mt-1.5 text-[12px] text-amber-300">{searchError}</p>}
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
                  <button key={a.id} type="button" onClick={() => pickAsteroid(a as Asteroid)}
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
                          {' · '}{a.velocity} km/s
                          {a.date ? ` · ${a.date}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
      </div>

      {/* The boom */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[12px] font-medium text-slate-400">💥 The explosion was as powerful as</p>
        <p className="mt-1 text-[28px] font-black leading-none text-orange-300">
          {hiroshimas(results.energyMt)} <span className="text-[18px] font-bold text-orange-200/80">Hiroshima bombs</span>
        </p>
        <p className="mt-1.5 text-[12px] text-slate-500">({results.energyMt >= 1 ? `${results.energyMt.toFixed(0)} megatons of TNT` : `${(results.energyMt * 1000).toFixed(0)} kilotons of TNT`})</p>
      </div>

      {/* People */}
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-white">👥 People in the area</p>
        <p className="mb-2 text-[12px] text-slate-500">How crowded is the spot it hit?</p>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(DENSITY_PRESETS) as DensityPreset[]).map((key) => (
            <button key={key} type="button" onClick={() => setDensityPreset(key)}
              className={`press-feedback rounded-xl border px-2.5 py-2.5 text-left transition ${
                densityPreset === key ? 'border-orange-500/50 bg-orange-500/12' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
              <p className={`text-[13px] font-semibold ${densityPreset === key ? 'text-orange-200' : 'text-slate-300'}`}>{DENSITY_PRESETS[key].label}</p>
              <p className="text-[10.5px] text-slate-500">{DENSITY_PRESETS[key].sublabel}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-center">
            <p className="text-[11px] font-medium text-red-300/80">Could not survive</p>
            <p className="mt-0.5 text-[20px] font-black text-red-300">{formatBig(casualties.totalDeaths)}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-center">
            <p className="text-[11px] font-medium text-amber-300/80">Would be hurt</p>
            <p className="mt-0.5 text-[20px] font-black text-amber-300">{formatBig(casualties.totalInjuries)}</p>
          </div>
        </div>
      </div>

      {/* Damage zones */}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-white">🎯 How far the damage spreads</p>
        <div className="space-y-1.5">
          {[
            { emoji: '🕳️', label: 'The crater', desc: 'A hole punched into the ground', r: results.craterDiameter / 2, color: '#FF3B1F' },
            { emoji: '🔥', label: 'Fireball', desc: 'Everything inside is vaporized', r: results.fireballRadius, color: '#FF6B2C' },
            { emoji: '💨', label: 'Shockwave', desc: 'Buildings knocked flat', r: results.blastRadius, color: '#FF9F1C' },
            { emoji: '🌡️', label: 'Heat blast', desc: 'Severe burns out to here', r: results.thermalRadius, color: '#FFD23F' },
          ].map((z) => (
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
          <p className="mt-0.5 text-[13px] font-semibold text-white">{formatDist(results.craterDiameter)} wide</p>
          <p className="text-[10.5px] text-slate-500">{craterCompare(results.craterDiameter)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Ground shaking</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">Magnitude {results.seismicMagnitude.toFixed(1)}</p>
          <p className="text-[10.5px] text-slate-500">like a {results.seismicMagnitude >= 7 ? 'massive' : results.seismicMagnitude >= 5 ? 'major' : 'small'} earthquake</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Speed of impact</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{results.impactVelocity.toFixed(0)} km/s</p>
          <p className="text-[10.5px] text-slate-500">~{Math.round(results.impactVelocity)}× faster than a bullet</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[11px] text-slate-500">Asteroid weight</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{formatBig(results.massKg)} kg</p>
          <p className="text-[10.5px] text-slate-500">of solid space rock</p>
        </div>
      </div>

      <button type="button" onClick={handleShare}
        className="press-feedback flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] py-3 text-[14px] font-semibold text-white hover:bg-white/[0.08]">
        {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Link copied!' : 'Share this impact'}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-slate-600">
        Just for fun and learning — not a real prediction. Built on real impact science.
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
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-[#07080f]/70 backdrop-blur-sm">
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
        <p className="text-[15px] font-bold leading-none text-white">Asteroid Map</p>
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
