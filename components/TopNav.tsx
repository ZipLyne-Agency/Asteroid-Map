'use client';

import { Crosshair, MapPin, Rocket, BarChart3, Play } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { ActiveSection } from '@/lib/store';

interface NavTab {
  id: ActiveSection;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}

export default function TopNav({ onSimulate, canSimulate }: { onSimulate: () => void; canSimulate: boolean }) {
  const location = useAppStore((state) => state.location);
  const asteroid = useAppStore((state) => state.asteroid);
  const simulationStatus = useAppStore((state) => state.simulationStatus);
  const activeSection = useAppStore((state) => state.activeSection);
  const setActiveSection = useAppStore((state) => state.setActiveSection);

  const isIdle = simulationStatus === 'idle';
  const isCompleted = simulationStatus === 'completed';

  const tabs: NavTab[] = [
    {
      id: 'location',
      icon: <MapPin className="h-3.5 w-3.5" />,
      label: 'Target',
      sublabel: location ? location.name.split(',')[0] : 'Pick a spot',
    },
    {
      id: 'asteroid',
      icon: <Rocket className="h-3.5 w-3.5" />,
      label: 'Space Rock',
      sublabel: asteroid ? asteroid.name.split(' ').slice(0, 2).join(' ') : 'Pick one',
    },
    {
      id: 'report',
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      label: 'What Happens',
      sublabel: isCompleted ? 'See the damage!' : 'Hit simulate first',
    },
  ];

  const handleTabClick = (id: ActiveSection) => {
    if (id === 'report' && !isCompleted) return;
    setActiveSection(id);
  };

  // Auto-advance section when items are set
  const getTabState = (tab: NavTab) => {
    if (tab.id === 'location') return Boolean(location) ? 'done' : activeSection === 'location' ? 'active' : 'idle';
    if (tab.id === 'asteroid') return Boolean(asteroid) ? 'done' : activeSection === 'asteroid' ? 'active' : 'idle';
    if (tab.id === 'report') return isCompleted ? (activeSection === 'report' ? 'active' : 'done') : 'disabled';
    return 'idle';
  };

  return (
    <header className="glass relative z-40 flex h-14 shrink-0 items-center border-b border-white/[0.07] px-4 gap-3">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0 pr-3 border-r border-white/8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/25 bg-gradient-to-br from-red-600/20 to-orange-600/10">
          <Crosshair className="h-4 w-4 text-red-400" />
        </div>
        <div className="hidden sm:block">
          <p className="font-orbitron text-[10px] font-bold tracking-[0.15em] text-white leading-none">ASTEROID IMPACT</p>
          <p className="font-orbitron text-[7.5px] tracking-[0.2em] text-violet-400 leading-none mt-0.5">SIMULATOR</p>
        </div>
      </div>

      {/* Step tabs */}
      <nav className="flex items-center gap-1 flex-1">
        {tabs.map((tab, i) => {
          const state = getTabState(tab);
          const isActive = activeSection === tab.id;
          const isDisabled = state === 'disabled';

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              disabled={isDisabled}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                isActive
                  ? 'bg-white/8 border border-white/10 text-white'
                  : isDisabled
                  ? 'text-slate-700 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/4'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold font-orbitron border transition-all ${
                state === 'done'
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-300'
                  : isActive
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/8 text-slate-600'
              }`}>
                {state === 'done' ? '✓' : `0${i + 1}`}
              </span>
              <div className="hidden md:block text-left">
                <p className={`text-[12px] font-semibold leading-none ${isActive ? 'text-white' : ''}`}>{tab.label}</p>
                <p className={`text-[10px] leading-none mt-0.5 truncate max-w-[120px] ${
                  state === 'done' ? 'text-violet-300/70' : 'text-slate-600'
                }`}>
                  {tab.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Simulate CTA */}
      {isIdle && (
        <button
          type="button"
          onClick={onSimulate}
          disabled={!canSimulate}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold font-orbitron tracking-[0.08em] transition-all ${
            canSimulate
              ? 'impact-btn-active text-white'
              : 'bg-white/4 text-slate-600 cursor-not-allowed border border-white/5'
          }`}
        >
          <Play className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">SIMULATE</span>
        </button>
      )}

      {isCompleted && (
        <button
          type="button"
          onClick={() => {
            useAppStore.getState().setSimulationStatus('idle');
            useAppStore.getState().setResults(null);
            setActiveSection('location');
          }}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-[12px] font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
        >
          ↺ <span className="hidden sm:inline">New Simulation</span>
        </button>
      )}
    </header>
  );
}
