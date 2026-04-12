'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore, Asteroid } from '@/lib/store';
import { Rocket, Calendar, RefreshCw, Info, Clock3, Star, ChevronDown, Sliders, X, Search } from 'lucide-react';
import { KNOWN_ASTEROID_CATEGORIES, type KnownAsteroidCategory } from '@/lib/known-asteroids';
import { formatDistanceToNowStrict } from 'date-fns';

interface NeoApiResponse {
  past?: Asteroid[];
  upcoming?: Asteroid[];
  counts?: { total: number; past: number; upcoming: number };
  error?: string;
  disclaimer?: string;
}

function formatSize(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters).toLocaleString()} m`;
}

// What to compare the asteroid size to
function sizeComparison(m: number): string {
  if (m < 5) return 'as big as a car';
  if (m < 20) return 'as big as a house';
  if (m < 50) return 'as tall as a 10-story building';
  if (m < 100) return 'as long as a football field';
  if (m < 300) return 'as tall as the Eiffel Tower';
  if (m < 500) return 'as tall as the Empire State Building';
  if (m < 1000) return 'bigger than the tallest mountain';
  if (m < 5000) return 'as wide as a whole town';
  if (m < 15000) return 'the one that killed all the dinosaurs was this big!';
  return 'bigger than a whole city — world-ending size';
}

const COMPOSITION_LABELS: Record<string, { label: string; desc: string }> = {
  ice: { label: 'Ice / Comet', desc: 'Like a dirty snowball from outer space' },
  porous_rock: { label: 'Loose Rock', desc: 'A pile of gravel floating through space' },
  dense_rock: { label: 'Solid Rock', desc: 'Hard as a boulder — most asteroids are like this' },
  iron: { label: 'Iron Metal', desc: 'Made of metal — the heaviest and scariest kind' },
};

export default function AsteroidPanel() {
  const asteroid = useAppStore((state) => state.asteroid);
  const setAsteroid = useAppStore((state) => state.setAsteroid);
  const impactAngle = useAppStore((state) => state.impactAngle);
  const setImpactAngle = useAppStore((state) => state.setImpactAngle);

  // Tab state: known | upcoming | past
  const [tab, setTab] = useState<'known' | 'upcoming' | 'past'>('known');
  const [knownCategory, setKnownCategory] = useState<KnownAsteroidCategory>('popular');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'distance'>('date');
  const [rangeDays, setRangeDays] = useState<30 | 180 | 365 | 3650>(365);

  // NASA data
  const [past, setPast] = useState<Asteroid[]>([]);
  const [upcoming, setUpcoming] = useState<Asteroid[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [counts, setCounts] = useState({ total: 0, past: 0, upcoming: 0 });

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 3;

  // Browser modal (all asteroids)
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);

  const knownList = KNOWN_ASTEROID_CATEGORIES[knownCategory].items;

  // Build the active list — known uses local data, others use NASA API
  const activeList = useMemo(() => {
    if (tab === 'known') return knownList;
    if (tab === 'upcoming') return upcoming;
    return past;
  }, [knownList, upcoming, past, tab]);

  const sortedList = useMemo(() => {
    const copy = [...activeList];
    copy.sort((a, b) => {
      if (sortBy === 'size') return b.diameter - a.diameter;
      if (sortBy === 'distance') {
        const aD = a.missDistanceKm ?? Number.POSITIVE_INFINITY;
        const bD = b.missDistanceKm ?? Number.POSITIVE_INFINITY;
        return aD - bD;
      }
      const aTime = a.dateIso ? new Date(a.dateIso).getTime() : 0;
      const bTime = b.dateIso ? new Date(b.dateIso).getTime() : 0;
      return tab === 'past' ? bTime - aTime : aTime - bTime;
    });
    return copy;
  }, [activeList, sortBy, tab]);

  const pagedList = useMemo(
    () => sortedList.slice(page * pageSize, page * pageSize + pageSize),
    [sortedList, page],
  );
  const pageCount = Math.max(1, Math.ceil(sortedList.length / pageSize));

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [tab, rangeDays, knownCategory, sortBy]);

  // Fetch NASA data when needed
  useEffect(() => {
    if (tab === 'known') return;
    const controller = new AbortController();
    void fetchApproaches(rangeDays, controller.signal);
    return () => controller.abort();
  }, [rangeDays, tab]);

  const fetchApproaches = async (days: number, signal?: AbortSignal) => {
    setLoading(true);
    setApiError(null);
    try {
      const limit = days >= 3650 ? 2500 : 500;
      const res = await fetch(`/api/neo/approaches?daysPast=${days}&daysFuture=${days}&limit=${limit}`, { signal });
      const data: NeoApiResponse = await res.json();
      if (!res.ok) { setApiError(data.error ?? 'Failed to load.'); setPast([]); setUpcoming([]); return; }
      setPast(data.past ?? []);
      setUpcoming(data.upcoming ?? []);
      setCounts(data.counts ?? { total: 0, past: 0, upcoming: 0 });
      setDisclaimer(data.disclaimer ?? '');
      if (!(data.past?.length || data.upcoming?.length)) setApiError('No asteroids found for this range.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setApiError('Network error. Check your connection.');
      setPast([]); setUpcoming([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  // Browser search across all lists
  const allKnownAsteroids = useMemo(() =>
    Object.values(KNOWN_ASTEROID_CATEGORIES).flatMap(c => c.items),
    [],
  );
  const browserData = useMemo(() => {
    const allNasa = [...upcoming, ...past];
    const allItems = [...allKnownAsteroids, ...allNasa];
    const q = browserSearch.trim().toLowerCase();
    const filtered = !q
      ? allItems
      : allItems.filter((item) =>
          item.name.toLowerCase().includes(q) || (item.date ?? '').toLowerCase().includes(q),
        );
    const maxRows = q ? 600 : 300;
    return {
      items: filtered.slice(0, maxRows),
      totalMatches: filtered.length,
    };
  }, [browserSearch, upcoming, past, allKnownAsteroids]);
  const browserList = browserData.items;
  const browserTruncated = browserData.totalMatches > browserList.length;

  // Show error only for API tabs
  const showError = apiError && tab !== 'known';
  // Show cards: always for known, for API tabs only when loaded
  const showCards = tab === 'known' || (!loading && !apiError);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5 text-amber-400" />
          <h2 className="font-orbitron text-[10px] font-semibold tracking-[0.16em] text-amber-300 uppercase">
            Pick a Space Rock
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBrowserOpen(true)}
            className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300 transition hover:bg-violet-500/20"
            type="button"
          >
            Browse All
          </button>
          {tab !== 'known' && (
            <button
              onClick={() => void fetchApproaches(rangeDays)}
              className="rounded-lg border border-white/7 bg-white/3 p-1.5 text-slate-400 transition hover:text-slate-200"
              type="button"
              title="Refresh NASA data"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Source tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/6 bg-white/[0.02] p-1">
        {(['known', 'upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg py-1.5 text-[11px] font-semibold tracking-wide transition ${
              tab === t
                ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'known' ? '📋 Notable' : t === 'upcoming' ? '🛰 Upcoming' : '🕐 Past'}
          </button>
        ))}
      </div>

      {/* Known sub-categories */}
      {tab === 'known' && (
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(KNOWN_ASTEROID_CATEGORIES) as KnownAsteroidCategory[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setKnownCategory(key)}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                knownCategory === key
                  ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/25'
                  : 'border border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300'
              }`}
            >
              {KNOWN_ASTEROID_CATEGORIES[key].emoji} {KNOWN_ASTEROID_CATEGORIES[key].label}
            </button>
          ))}
        </div>
      )}

      {/* NASA range + counts */}
      {tab !== 'known' && (
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
          <div className="relative">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value) as 30 | 180 | 365 | 3650)}
              className="appearance-none rounded-lg border border-white/8 bg-[rgba(5,7,18,0.6)] pl-2 pr-6 py-1 text-[12px] text-white outline-none"
            >
              <option value={30}>30 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={3650}>10 years</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          </div>
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            {counts.upcoming} up · {counts.past} past
          </span>
        </div>
      )}

      {/* Sort control */}
      <div className="flex items-center gap-2">
        <label className="font-orbitron text-[9px] tracking-widest text-slate-600 uppercase">Sort</label>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'size' | 'distance')}
            className="appearance-none rounded-lg border border-white/8 bg-[rgba(5,7,18,0.6)] pl-2 pr-6 py-1 text-[11px] text-white outline-none"
          >
            <option value="date">By date</option>
            <option value="size">By size (largest first)</option>
            <option value="distance">By closest pass</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
        </div>
        {tab !== 'known' && disclaimer && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-slate-600">
            <Info className="h-2.5 w-2.5" /> NASA live
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-2 flex gap-1 justify-center">
            <div className="dot-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <div className="dot-2 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <div className="dot-3 h-1.5 w-1.5 rounded-full bg-violet-400" />
          </div>
          <p className="text-[12px] text-slate-500">Asking NASA for asteroid info…</p>
        </div>
      )}

      {/* Error */}
      {showError && (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-[11px] text-amber-300">
          {apiError}
        </p>
      )}

      {/* Asteroid cards */}
      {showCards && (
        <div className="space-y-2">
          {pagedList.length === 0 && !loading && (
            <p className="py-4 text-center text-[12px] text-slate-600">
              {tab === 'known' ? 'Nothing here yet!' : 'No asteroids found — try a different time range.'}
            </p>
          )}
          {pagedList.map((entry) => (
            <AsteroidCard
              key={`${entry.id}-${entry.dateIso ?? entry.date}`}
              asteroid={entry}
              selected={asteroid?.id === entry.id && asteroid?.dateIso === entry.dateIso}
              onSelect={() => setAsteroid(entry)}
            />
          ))}

          {sortedList.length > pageSize && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-white/7 px-3 py-1 text-[11px] text-slate-400 disabled:opacity-30 hover:text-slate-200"
              >
                ← Prev
              </button>
              <span className="font-mono text-[10px] text-slate-600">{page + 1} / {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="rounded-lg border border-white/7 px-3 py-1 text-[11px] text-slate-400 disabled:opacity-30 hover:text-slate-200"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected asteroid: advanced parameters */}
      {asteroid && (
        <div className="border-t border-white/6 pt-3 space-y-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] text-slate-500 hover:text-slate-300"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3 w-3" />
              Change how it hits
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="space-y-4 animate-fadeInUp">
              {/* Size slider */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">Asteroid Diameter</label>
                  <span className="font-mono text-[12px] text-cyan-400">{formatSize(asteroid.diameter)}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="10000"
                  step="10"
                  value={Math.min(asteroid.diameter, 10000)}
                  onChange={(e) => setAsteroid({ ...asteroid, diameter: Number(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
                <p className="mt-1 text-[10px] text-slate-600">About the {sizeComparison(asteroid.diameter)}</p>
              </div>

              {/* Velocity slider */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">Speed</label>
                  <span className="font-mono text-[12px] text-cyan-400">{asteroid.velocity.toFixed(1)} km/s</span>
                </div>
                <input
                  type="range"
                  min="11.2"
                  max="72"
                  step="0.5"
                  value={asteroid.velocity}
                  onChange={(e) => setAsteroid({ ...asteroid, velocity: Number(e.target.value) })}
                  className="w-full accent-orange-500"
                />
                <div className="mt-1 flex justify-between text-[9px] text-slate-600">
                  <span>11 km/s (pretty fast)</span>
                  <span>72 km/s (insanely fast!)</span>
                </div>
              </div>

              {/* Impact angle */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">Entry Angle</label>
                  <span className="font-mono text-[12px] text-cyan-400">{impactAngle}°</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  value={impactAngle}
                  onChange={(e) => setImpactAngle(Number.parseInt(e.target.value, 10))}
                  className="w-full accent-violet-500"
                />
                <div className="mt-1 flex justify-between text-[9px] text-slate-600">
                  <span>15° (barely touches)</span>
                  <span>90° (smashes straight down)</span>
                </div>
              </div>

              {/* Composition */}
              <div>
                <label className="mb-1.5 block font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">Composition</label>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(COMPOSITION_LABELS).map(([val, info]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAsteroid({ ...asteroid, composition: val as Asteroid['composition'] })}
                      className={`rounded-xl border px-2.5 py-2 text-left transition ${
                        asteroid.composition === val
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                          : 'border-white/6 bg-white/[0.02] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <p className="text-[11px] font-semibold">{info.label}</p>
                      <p className="text-[9px] opacity-60 mt-0.5 leading-tight">{info.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ASTEROID BROWSER MODAL ── */}
      {browserOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBrowserOpen(false)} />

          {/* Drawer */}
          <div className="glass relative z-10 ml-auto flex h-full w-[420px] flex-col border-l border-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/6 p-4">
              <div>
                <h3 className="font-orbitron text-[11px] font-bold tracking-[0.14em] text-white">ALL SPACE ROCKS</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {browserData.totalMatches.toLocaleString()} matches
                  {browserTruncated ? ` · showing first ${browserList.length}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setBrowserOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/8">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-white/6 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={browserSearch}
                  onChange={(e) => setBrowserSearch(e.target.value)}
                  placeholder="Search by name or date…"
                  className="w-full rounded-xl border border-white/8 bg-[rgba(5,7,18,0.7)] py-2 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-slate-600 focus:border-violet-500/40"
                />
              </div>
            </div>

            {/* List */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-3 space-y-2">
              {browserList.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-600">No asteroids match your search.</p>
              )}
              {browserList.map((entry) => (
                <AsteroidCard
                  key={`browser-${entry.id}-${entry.dateIso ?? entry.date}`}
                  asteroid={entry}
                  selected={asteroid?.id === entry.id}
                  onSelect={() => {
                    setAsteroid(entry);
                    setBrowserOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AsteroidCard({ asteroid, selected, onSelect }: { asteroid: Asteroid; selected: boolean; onSelect: () => void }) {
  const parsedDate = asteroid.dateIso ? new Date(asteroid.dateIso) : null;
  const hasValidDate = Boolean(parsedDate && Number.isFinite(parsedDate.getTime()));
  const relativeFromDate = hasValidDate
    ? formatDistanceToNowStrict(parsedDate!, { addSuffix: true })
    : undefined;
  const derivedRelativeTime = relativeFromDate ?? asteroid.relativeTime;
  const derivedApproachType = relativeFromDate
    ? (relativeFromDate.startsWith('in ') ? 'upcoming' : 'past')
    : (asteroid.approachType ?? (derivedRelativeTime?.startsWith('in ') ? 'upcoming' : 'past'));

  return (
    <button
      onClick={onSelect}
      type="button"
      className={`group w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-violet-400/50 bg-violet-500/12 shadow-[0_0_16px_rgba(139,92,246,0.12)]'
          : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-white leading-tight">{asteroid.name}</p>
        <div className="flex shrink-0 items-center gap-1">
          {asteroid.source === 'known' && <Star className="h-3 w-3 text-amber-400/60" />}
          {asteroid.isPotentiallyHazardous && (
            <span className="rounded-full border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 font-orbitron text-[7px] tracking-widest text-red-300">PHO</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 font-mono text-[10px] text-slate-400">
        <span><span className="text-slate-600">SIZE </span>{Math.round(asteroid.diameter).toLocaleString()} m</span>
        <span><span className="text-slate-600">SPEED </span>{asteroid.velocity.toFixed(1)} km/s</span>
        {asteroid.missDistance && (
          <span className="col-span-2"><span className="text-slate-600">MISS </span>{asteroid.missDistance}</span>
        )}
      </div>

      {asteroid.date && (
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-white/4 pt-1.5">
          <Calendar className="h-3 w-3 text-slate-600" />
          <span className="text-[10px] text-slate-500">{asteroid.date}</span>
          {derivedRelativeTime && (
            <span className={`ml-auto text-[10px] ${derivedApproachType === 'upcoming' ? 'text-amber-400' : 'text-slate-600'}`}>
              {derivedRelativeTime}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
