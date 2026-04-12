'use client';

import { FormEvent, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Search, MapPin, Navigation, LocateFixed, ChevronDown } from 'lucide-react';
import { MAJOR_CITIES } from '@/lib/major-cities';

interface GeocodeResult {
  id: string;
  placeName: string;
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  results?: GeocodeResult[];
  error?: string;
}

export default function SearchPanel() {
  const location = useAppStore((state) => state.location);
  const setLocation = useAppStore((state) => state.setLocation);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchLocation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = query.trim();
    if (cleaned.length < 3) {
      setError('Enter at least 3 characters.');
      setResults([]);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(cleaned)}&limit=6`);
      const data: GeocodeResponse = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Location search failed.');
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
      if (!data.results?.length) setError('No matches found. Try a broader place name.');
    } catch {
      setError('Could not reach location service.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (result: GeocodeResult) => {
    setLocation({ lng: result.lng, lat: result.lat, name: result.placeName });
    setResults([]);
    setError(null);
    setQuery('');
  };

  const handleSelectMajorCity = (cityId: string) => {
    setSelectedCityId(cityId);
    const city = MAJOR_CITIES.find((item) => item.id === cityId);
    if (!city) return;
    setLocation({ lng: city.lng, lat: city.lat, name: `${city.name}, ${city.country}` });
    setResults([]);
    setError(null);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
          name: 'Current Location',
        });
        setError(null);
      },
      () => {
        setError('Unable to access location. Check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div>
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-cyan-400" />
        <h2 className="font-orbitron text-[10px] font-semibold tracking-[0.16em] text-cyan-300 uppercase">
          01 · Where should it land?
        </h2>
      </div>

      {location ? (
        /* ── Location selected state ── */
        <div className="glass-inner rounded-xl p-3.5 animate-fadeInUp">
          <p className="font-orbitron mb-1.5 text-[9px] tracking-[0.16em] text-slate-500 uppercase">
            Landing Spot
          </p>
          <p className="text-sm font-semibold text-white">{location.name}</p>
          <p className="font-mono mt-1.5 text-[11px] text-cyan-400">
            {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}°
          </p>
          <button
            onClick={() => setLocation(null)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
            type="button"
          >
            <LocateFixed className="h-3 w-3" />
            Pick a different spot
          </button>
        </div>
      ) : (
        /* ── Location selection UI ── */
        <div className="space-y-2.5">
          {/* Major cities quick select */}
          <div>
            <label className="mb-1.5 block font-orbitron text-[9px] tracking-[0.14em] text-slate-500 uppercase">
              Pick a Famous City
            </label>
            <div className="relative">
              <select
                value={selectedCityId}
                onChange={(e) => handleSelectMajorCity(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/8 bg-[rgba(5,7,18,0.65)] px-3 py-2.5 pr-8 text-[13px] text-white outline-none transition focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
              >
                <option value="">Pick a city…</option>
                {MAJOR_CITIES.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.country}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Custom search */}
          <form onSubmit={searchLocation} className="space-y-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type any place on Earth…"
                className="w-full rounded-xl border border-white/8 bg-[rgba(5,7,18,0.65)] py-2.5 pl-9 pr-3 text-[13px] text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
              />
            </label>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full rounded-xl border border-violet-500/40 bg-violet-600/25 px-4 py-2.5 text-[12px] font-semibold tracking-wide text-violet-200 transition hover:bg-violet-600/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? 'Looking…' : 'Find this place'}
            </button>
          </form>

          {/* GPS */}
          <button
            onClick={useCurrentLocation}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/7 bg-white/3 px-4 py-2.5 text-[12px] text-slate-400 transition hover:border-cyan-500/30 hover:text-cyan-300"
            type="button"
          >
            <Navigation className="h-3.5 w-3.5" />
            Use where I am right now
          </button>

          {error && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-300">
              {error}
            </p>
          )}

          {/* Search results */}
          {results.length > 0 && (
            <div className="glass-inner overflow-hidden rounded-xl">
              {results.slice(0, 5).map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-slate-300 transition hover:bg-violet-500/10 hover:text-white border-b border-white/4 last:border-0"
                  type="button"
                >
                  <MapPin className="h-3 w-3 shrink-0 text-slate-600" />
                  {result.placeName}
                </button>
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-600 text-center">or just tap anywhere on the map!</p>
        </div>
      )}
    </div>
  );
}
