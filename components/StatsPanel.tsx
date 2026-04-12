'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore, DENSITY_PRESETS, type DensityPreset } from '@/lib/store';
import { estimateCasualties } from '@/lib/physics';
import { Share2, Check } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBig(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return Math.round(n).toLocaleString();
}

/** Megaton yield (fractional); do not use formatBig — it rounds sub-0.5 values to 0. */
function formatMegatons(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(3);
  if (n >= 0.0001) return n.toFixed(5);
  return n.toExponential(2);
}

function formatDist(m: number): string {
  if (m >= 1_000_000) return `${(m / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} km`;
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatEnergy(mt: number): string {
  if (mt >= 1_000_000) return `${(mt / 1_000_000).toFixed(1)} trillion tons of TNT`;
  if (mt >= 1000) return `${(mt / 1000).toFixed(1)} billion tons of TNT`;
  if (mt >= 1) return `${mt.toFixed(1)} million tons of TNT`;
  return `${(mt * 1000).toFixed(0)} thousand tons of TNT`;
}

function hiroshimaCount(mt: number): string {
  const h = mt / 0.015;
  if (h >= 1e6) return `${(h / 1e6).toFixed(0)}M× Hiroshima`;
  if (h >= 1000) return `${(h / 1000).toFixed(0)}k× Hiroshima`;
  return `${Math.round(h)}× Hiroshima`;
}

function recurrenceText(years: number): string {
  if (years <= 1) return 'Could happen any year — yikes!';
  if (years < 100) return `Happens about once every ${years} years`;
  if (years < 1000) return `Happens about once every ${(years / 100).toFixed(0)} hundred years`;
  if (years < 1_000_000) return `Super rare — once every ${(years / 1000).toFixed(0)},000 years`;
  return `Almost never — once every ${(years / 1_000_000).toFixed(0)} million years`;
}

/** Counts up from 0 to target, returns formatted string */
function useCountUp(target: number, format: (n: number) => string = formatBig): string {
  const [val, setVal] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const duration = 1400;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(target * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return format(val);
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; plain: string }> = {
  low:      { label: 'Small',        color: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/8',  plain: 'Would mess up a neighborhood — like a really bad explosion.' },
  moderate: { label: 'Big',          color: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/8',   plain: 'Would flatten a whole city. Really, really bad.' },
  high:     { label: 'Huge',         color: 'text-orange-300',  border: 'border-orange-500/40',  bg: 'bg-orange-500/8',  plain: 'Would destroy an entire country. Like nothing we\'ve ever seen.' },
  extreme:  { label: 'Dino-Killer',  color: 'text-red-300',     border: 'border-red-500/40',     bg: 'bg-red-500/8',     plain: 'This is the kind that wiped out the dinosaurs. Game over for everyone.' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function StatsPanel() {
  const results = useAppStore((state) => state.results);
  const location = useAppStore((state) => state.location);
  const asteroid = useAppStore((state) => state.asteroid);
  const densityPreset = useAppStore((state) => state.densityPreset);
  const setDensityPreset = useAppStore((state) => state.setDensityPreset);
  const density = DENSITY_PRESETS[densityPreset].value;
  const casualties = results ? estimateCasualties(results, density) : null;
  const severity = results ? (SEVERITY_CONFIG[results.severity] ?? SEVERITY_CONFIG.moderate) : SEVERITY_CONFIG.moderate;

  const deathDisplay  = useCountUp(casualties?.totalDeaths ?? 0);
  const injuredDisplay = useCountUp(casualties?.totalInjuries ?? 0);

  const [copied, setCopied] = useState(false);
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

  if (!results || !location || !asteroid || !casualties) return null;

  return (
    <div className="space-y-4 animate-fadeInUp">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center justify-between">
          <p className="font-orbitron text-[9px] tracking-[0.18em] text-violet-400 uppercase">What Would Happen</p>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-300 transition hover:bg-violet-500/20"
          >
            {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
            {copied ? 'Link copied!' : 'Share this'}
          </button>
        </div>
        <h2 className="mt-1 text-[15px] font-semibold text-white leading-tight">{location.name}</h2>
        <p className="text-[12px] text-slate-500">{asteroid.name} · {asteroid.diameter.toLocaleString()} m</p>
      </div>

      {/* ── What just happened (plain language) ── */}
      <div className={`rounded-xl border p-3 ${severity.border} ${severity.bg}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">How bad is it?</span>
          <span className={`font-orbitron text-[10px] font-bold tracking-wide uppercase ${severity.color}`}>{severity.label}</span>
        </div>
        <p className="text-[12px] text-slate-300 leading-relaxed">{severity.plain}</p>
      </div>

      {/* ── Energy in plain language ── */}
      <div className="glass-inner rounded-xl p-4">
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase mb-1">How big is the boom?</p>
        <EnergyHero mt={results.energyMt} />
        <p className="mt-1 text-[11px] text-slate-500">{hiroshimaCount(results.energyMt)}</p>
        <p className="mt-0.5 text-[10px] text-slate-600">{recurrenceText(results.recurrenceYears)}</p>
      </div>

      {/* ── Casualties ── */}
      <div className="space-y-2">
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">
          How many people would get hurt?
        </p>

        {/* Density picker */}
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(DENSITY_PRESETS) as DensityPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setDensityPreset(key)}
              className={`rounded-xl border px-2.5 py-2 text-left transition text-[11px] ${
                densityPreset === key
                  ? 'border-violet-500/40 bg-violet-500/12 text-violet-200'
                  : 'border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300'
              }`}
            >
              <p className="font-semibold">{DENSITY_PRESETS[key].label}</p>
              <p className="text-[9px] opacity-60">{DENSITY_PRESETS[key].sublabel}</p>
            </button>
          ))}
        </div>

        {/* Death + Injury counts */}
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-inner rounded-xl p-3 text-center">
            <p className="font-orbitron text-[8px] tracking-widest text-red-400/70 uppercase mb-1">Deaths</p>
            <p className="font-orbitron text-2xl font-black text-red-300">{deathDisplay}</p>
          </div>
          <div className="glass-inner rounded-xl p-3 text-center">
            <p className="font-orbitron text-[8px] tracking-widest text-amber-400/70 uppercase mb-1">Injured</p>
            <p className="font-orbitron text-2xl font-black text-amber-300">{injuredDisplay}</p>
          </div>
        </div>

        <p className="text-[9px] text-slate-600 text-center leading-relaxed">
          This assumes {DENSITY_PRESETS[densityPreset].value.toLocaleString()} people per square kilometer. The real number depends on exactly where it lands.
        </p>
      </div>

      {/* ── Destruction Zones ── */}
      <div className="space-y-1.5">
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">What gets destroyed?</p>

        <ZoneRow
          emoji="🕳️"
          color="#FF1A00"
          label="The Hole"
          radius={results.craterDiameter / 2}
          maxRadius={results.thermalRadius}
          what="Everything here is gone — turned to dust instantly"
          deaths={casualties.craterDeaths}
        />
        <ZoneRow
          emoji="🔥"
          color="#FF4400"
          label="Giant Fireball"
          radius={results.fireballRadius}
          maxRadius={results.thermalRadius}
          what="So hot that everything catches fire — nothing survives"
          deaths={casualties.fireballDeaths}
        />
        <ZoneRow
          emoji="💥"
          color="#FF8800"
          label="Shock Wave"
          radius={results.blastRadius}
          maxRadius={results.thermalRadius}
          what="A wall of air that knocks down every building"
          deaths={casualties.blastDeaths}
          injuries={casualties.blastInjuries}
        />
        <ZoneRow
          emoji="🌡️"
          color="#FFD600"
          label="Burns Zone"
          radius={results.thermalRadius}
          maxRadius={results.thermalRadius}
          what="Hot enough to burn your skin even this far away"
          deaths={casualties.thermalDeaths}
          injuries={casualties.thermalInjuries}
        />
      </div>

      {/* ── Key facts ── */}
      <div className="space-y-1.5">
        <p className="font-orbitron text-[9px] tracking-widest text-slate-500 uppercase">The Numbers</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="How fast it hits" value={`${results.impactVelocity.toFixed(1)} km/s`} note="that's insanely fast" />
          <Stat label="Earthquake size" value={`M ${results.seismicMagnitude.toFixed(1)}`} note="how hard the ground shakes" />
          <Stat label="Hole in the ground" value={formatDist(results.craterDiameter)} note={`${formatDist(results.craterDepth)} deep`} />
          <Stat label="How heavy it is" value={formatBig(results.massKg) + ' kg'} note="the space rock's weight" />
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-[10px] leading-relaxed text-slate-600">
        These numbers are based on real science (Collins et al. 2005), but they&apos;re just estimates for fun and learning — not a real warning!
      </p>
    </div>
  );
}

function EnergyHero({ mt }: { mt: number }) {
  const gradient =
    mt >= 1000 ? 'from-red-400 via-orange-300 to-amber-200'
    : mt >= 5   ? 'from-orange-400 via-amber-300 to-yellow-200'
    :             'from-yellow-400 to-amber-300';

  const display = useCountUp(mt, formatMegatons);

  return (
    <p className={`font-orbitron bg-gradient-to-r bg-clip-text text-[2.6rem] font-black leading-none text-transparent ${gradient}`}>
      {display}
      <span className="text-xl ml-1">Mt</span>
    </p>
  );
}

function ZoneRow({
  emoji, color, label, radius, maxRadius, what, deaths, injuries,
}: {
  emoji: string;
  color: string;
  label: string;
  radius: number;
  maxRadius: number;
  what: string;
  deaths?: number;
  injuries?: number;
}) {
  const pct = Math.min(100, (radius / maxRadius) * 100);

  return (
    <div className="glass-inner rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{emoji}</span>
          <span className="text-[13px] font-semibold text-white">{label}</span>
        </div>
        <span className="font-mono text-[12px] text-slate-300">{formatDist(radius)}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/6">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>

      <p className="text-[10px] text-slate-500 mb-1">{what}</p>

      {(deaths !== undefined && deaths > 0) && (
        <div className="flex gap-2 text-[10px]">
          {deaths > 0 && <span className="text-red-400/70">☠ {formatBig(deaths)} dead</span>}
          {injuries !== undefined && injuries > 0 && <span className="text-amber-400/60">⚕ {formatBig(injuries)} injured</span>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="glass-inner rounded-xl p-3">
      <p className="font-orbitron text-[8.5px] tracking-[0.12em] text-slate-500 uppercase">{label}</p>
      <p className="font-mono mt-1 text-[14px] font-semibold text-white">{value}</p>
      <p className="text-[9px] text-slate-600">{note}</p>
    </div>
  );
}
