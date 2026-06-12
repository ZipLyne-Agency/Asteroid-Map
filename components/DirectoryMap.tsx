'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  GeolocateControl,
  Layer,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl/maplibre';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import Supercluster from 'supercluster';
import { useAppStore } from '@/lib/store';
import { MAJOR_CITIES } from '@/lib/major-cities';

interface ReverseGeocodeResponse { name?: string | null }
interface BusinessPointProperties {
  cluster: boolean; pointType: 'major_city' | 'selected';
  businessId: string; name: string; googleMapsUrl: string | null;
}

const FALLBACK_CENTER: [number, number] = [-30, 20];

const CLUSTER_LAYER: LayerProps = {
  id: 'clusters', type: 'circle', filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#7C3AED', 'circle-radius': ['step', ['get', 'point_count'], 14, 20, 18, 50, 22],
    'circle-opacity': 0.85, 'circle-stroke-color': '#A78BFA', 'circle-stroke-width': 1.5,
  },
};
const CLUSTER_COUNT_LAYER: LayerProps = {
  id: 'cluster-count', type: 'symbol', filter: ['has', 'point_count'],
  layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] },
  paint: { 'text-color': '#F5F3FF' },
};
const UNCLUSTERED_LAYER: LayerProps = {
  id: 'unclustered-point', type: 'circle', filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': ['match', ['get', 'pointType'], 'selected', '#EF4444', '#22D3EE'],
    'circle-radius': ['match', ['get', 'pointType'], 'selected', 6, 4],
    'circle-stroke-color': ['match', ['get', 'pointType'], 'selected', '#FCA5A5', '#67E8F9'],
    'circle-stroke-width': 1.5,
    'circle-opacity': ['match', ['get', 'pointType'], 'selected', 0, 0.7],
  },
};
const CITY_LABEL_LAYER: LayerProps = {
  id: 'major-city-labels', type: 'symbol',
  filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'pointType'], 'major_city']],
  layout: { 'text-field': ['get', 'name'], 'text-size': 9, 'text-offset': [0, 1.1], 'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'] },
  paint: { 'text-color': '#94A3B8', 'text-halo-color': '#07080F', 'text-halo-width': 1.5 },
};

/** Geodesic circle polygon (accurate on sphere) */
function getGeodesicPolygon(lat: number, lng: number, radiusM: number, points = 96): [number, number][] {
  const R = 6371e3;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const poly: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const bearing = ((i * 360) / points) * (Math.PI / 180);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(radiusM / R) + Math.cos(lat1) * Math.sin(radiusM / R) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(radiusM / R) * Math.cos(lat1), Math.cos(radiusM / R) - Math.sin(lat1) * Math.sin(lat2));
    poly.push([lng2 * (180 / Math.PI), lat2 * (180 / Math.PI)]);
  }
  if (poly.length > 0) poly.push(poly[0]);
  return poly;
}

function toGeoJsonPolygon(radiusM: number, lat: number, lng: number, scale: number): Feature<Polygon> {
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [getGeodesicPolygon(lat, lng, radiusM * scale)] } };
}

function toZonePolygon(radiusM: number, lat: number, lng: number): Feature<Polygon> | null {
  return radiusM > 0 ? toGeoJsonPolygon(radiusM, lat, lng, 1) : null;
}

/** Compute a point at bearing (degrees) and distance from center (for zone labels) */
function offsetPoint(lat: number, lng: number, bearingDeg: number, distM: number): [number, number] {
  const R = 6371e3;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distM / R) + Math.cos(lat1) * Math.sin(distM / R) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distM / R) * Math.cos(lat1), Math.cos(distM / R) - Math.sin(lat1) * Math.sin(lat2));
  return [lng2 * (180 / Math.PI), lat2 * (180 / Math.PI)];
}

function getBoundsFromPolygon(polygon: Feature<Polygon>): [[number, number], [number, number]] {
  const coords = polygon.geometry.coordinates[0];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng); minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng); maxLat = Math.max(maxLat, lat);
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    const data: ReverseGeocodeResponse = await res.json();
    return data.name ?? null;
  } catch { return null; }
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export default function DirectoryMap() {
  const mapRef = useRef<MapRef>(null);
  const location = useAppStore((state) => state.location);
  const results = useAppStore((state) => state.results);
  const targetMaterial = useAppStore((state) => state.targetMaterial);
  const simulationStatus = useAppStore((state) => state.simulationStatus);
  const setLocation = useAppStore((state) => state.setLocation);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [animProg, setAnimProg] = useState(0);
  const [zoom, setZoom] = useState(3);
  const [bounds, setBounds] = useState<[number, number, number, number]>([-180, -90, 180, 90]);

  // ── Point data ──────────────────────────────────────────────────────────────
  const points = useMemo<Array<Feature<Point, BusinessPointProperties>>>(() => {
    const cities = MAJOR_CITIES.map((city) => ({
      type: 'Feature' as const,
      properties: { cluster: false, pointType: 'major_city' as const, businessId: city.id, name: `${city.name}, ${city.country}`, googleMapsUrl: null },
      geometry: { type: 'Point' as const, coordinates: [city.lng, city.lat] as [number, number] },
    }));
    if (!location) return cities;
    return [...cities, {
      type: 'Feature' as const,
      properties: { cluster: false, pointType: 'selected' as const, businessId: 'selected', name: location.name, googleMapsUrl: null },
      geometry: { type: 'Point' as const, coordinates: [location.lng, location.lat] as [number, number] },
    }];
  }, [location]);

  const supercluster = useMemo(() => {
    const idx = new Supercluster<BusinessPointProperties>({ radius: 50, maxZoom: 16 });
    idx.load(points);
    return idx;
  }, [points]);

  const clusters = useMemo(() => supercluster.getClusters(bounds, zoom), [supercluster, bounds, zoom]);
  const clusterCollection = useMemo<FeatureCollection>(() => ({ type: 'FeatureCollection', features: clusters as Feature[] }), [clusters]);

  // ── Center on location ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady || !location) return;
    try { mapRef.current.easeTo({ center: [location.lng, location.lat], zoom: 10, duration: 600 }); } catch {}
  }, [location, mapReady]);

  // ── Simulation animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (simulationStatus !== 'running') return;
    const start = performance.now();
    const duration = 2400;
    let id = 0;
    const run = (t: number) => {
      const p = Math.max(0, Math.min((t - start) / duration, 1));
      setAnimProg(Math.max(0, 1 - Math.pow(1 - p, 3)));
      if (p < 1) id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [simulationStatus]);

  const zoneScale = Math.max(0, simulationStatus === 'running' ? animProg : simulationStatus === 'completed' ? 1 : 0);

  // ── Impact zones ────────────────────────────────────────────────────────────
  const craterZone   = useMemo(() => location && results ? toZonePolygon(results.craterDiameter / 2, location.lat, location.lng) : null, [location, results]);
  const fireballZone = useMemo(() => location && results ? toZonePolygon(results.fireballRadius, location.lat, location.lng) : null, [location, results]);
  const blastZone    = useMemo(() => location && results ? toZonePolygon(results.blastRadius, location.lat, location.lng) : null, [location, results]);
  const minorBlastZone = useMemo(() => location && results ? toZonePolygon(results.minorBlastRadius, location.lat, location.lng) : null, [location, results]);
  const thermalZone  = useMemo(() => location && results ? toZonePolygon(results.thermalRadius, location.lat, location.lng) : null, [location, results]);
  const outerZone = useMemo(() => {
    if (!location || !results) return null;
    const radius = Math.max(results.craterDiameter / 2, results.fireballRadius, results.blastRadius, results.minorBlastRadius, results.thermalRadius);
    return radius > 0 ? toGeoJsonPolygon(radius, location.lat, location.lng, 1) : null;
  }, [location, results]);

  // Fit map to the outermost modeled zone when simulation completes
  useEffect(() => {
    if (!mapRef.current || !mapReady || !outerZone || simulationStatus === 'idle') return;
    try { mapRef.current.fitBounds(getBoundsFromPolygon(outerZone), { padding: 60, maxZoom: 12, duration: 900 }); } catch {}
  }, [mapReady, simulationStatus, outerZone]);

  // ── Zone label positions (placed inside each annular ring) ──────────────────
  const zoneLabels = useMemo(() => {
    if (!location || !results || zoneScale < 0.8) return [];
    const lat = location.lat;
    const lng = location.lng;
    const cr = results.craterDiameter / 2;
    const fr = results.fireballRadius;
    const br = results.blastRadius;
    const mr = results.minorBlastRadius;
    const tr = results.thermalRadius;

    const labels = [
      // Crater: centered (0 inner radius)
      { id: 'crater',   text: targetMaterial === 'water' ? '🌊 Water cavity' : '🕳️ Crater', color: '#FF5533', pos: offsetPoint(lat, lng, 0,   cr * 0.5) },
      // Fireball: in the ring between crater edge and fireball edge
      { id: 'fireball', text: '🔥 Fireball',   color: '#FF7700', pos: offsetPoint(lat, lng, 45,  (cr + fr) / 2) },
      // Blast: in the ring between fireball and blast
      { id: 'blast',    text: '💨 Shockwave',  color: '#FFAA00', pos: offsetPoint(lat, lng, 135, (fr + br) / 2) },
      { id: 'minor-blast', text: '🪟 Windows', color: '#8BD3FF', pos: offsetPoint(lat, lng, 180, (Math.max(br, tr) + mr) / 2) },
      // Thermal: in the ring between blast and thermal
      { id: 'thermal',  text: '🌡️ Heat blast', color: '#FFD600', pos: offsetPoint(lat, lng, 225, (br + tr) / 2) },
    ];

    // Only include labels where there's meaningful space (annular ring > 500m)
    return labels.filter((_, i) => {
      if (i === 0) return cr > 200;
      if (i === 1) return fr - cr > 500;
      if (i === 2) return br - fr > 500;
      if (i === 3) return mr - Math.max(br, tr) > 500;
      return tr - br > 500;
    });
  }, [location, results, targetMaterial, zoneScale]);

  const handleMove = () => {
    const b = mapRef.current?.getBounds();
    if (b) setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    const nextZoom = Math.round(mapRef.current?.getZoom() ?? 3);
    setZoom((prev) => (prev === nextZoom ? prev : nextZoom));
  };

  const handleZoomChange = (nextZoomRaw: number) => {
    const nextZoom = Math.round(nextZoomRaw);
    setZoom((prev) => (prev === nextZoom ? prev : nextZoom));
  };

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (simulationStatus !== 'idle') return;
    const feature = e.features?.[0];
    if (feature?.properties?.cluster_id) {
      const clusterId = feature.properties.cluster_id as number;
      const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 15);
      const [lng, lat] = (feature.geometry as Point).coordinates;
      mapRef.current?.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 350 });
      return;
    }
    const pointType = feature?.properties?.pointType as string | undefined;
    if (pointType === 'major_city' || pointType === 'selected') {
      const [lng, lat] = (feature?.geometry as Point).coordinates;
      setLocation({ lng, lat, name: String(feature?.properties?.name ?? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`) });
      return;
    }
    const { lng, lat } = e.lngLat;
    void reverseGeocode(lat, lng).then((name) => setLocation({ lat, lng, name: name ?? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°` }));
  };

  const zonesVisible =
    zoneScale >= 0.8 &&
    results &&
    Math.max(results.craterDiameter / 2, results.fireballRadius, results.blastRadius, results.minorBlastRadius, results.thermalRadius) > 0;

  return (
    <div className="relative h-full w-full bg-[#07080f]">
      <Map
        ref={mapRef}
        reuseMaps
        initialViewState={{ longitude: FALLBACK_CENTER[0], latitude: FALLBACK_CENTER[1], zoom: 2.5 }}
        projection="mercator"
        minZoom={1.5} maxZoom={18}
        scrollZoom doubleClickZoom dragRotate={false} touchPitch={false}
        onMove={(e) => handleZoomChange(e.viewState.zoom)}
        onLoad={() => { setMapReady(true); handleMove(); }}
        onMoveEnd={handleMove}
        interactiveLayerIds={['clusters', 'unclustered-point', 'major-city-labels']}
        onClick={handleMapClick}
        onError={(e) => {
          const msg = e.error?.message ?? 'Map failed to load.';
          // Map errors can fire during a Layer render; defer the state update to
          // the next frame so we never setState mid-render.
          requestAnimationFrame(() => setMapError(msg));
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      >
        <NavigationControl showCompass={false} position="top-right" />
        <GeolocateControl
          trackUserLocation={false} showUserLocation position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          onGeolocate={(pos) => {
            const lat = pos.coords.latitude; const lng = pos.coords.longitude;
            void reverseGeocode(lat, lng).then((name) => {
              setLocation({ lat, lng, name: name ?? 'Current Location' });
              mapRef.current?.easeTo({ center: [lng, lat], zoom: 12, duration: 450 });
            });
          }}
        />
        <ScaleControl unit="metric" position="bottom-right" />

        {/* City clusters */}
        <Source id="directory-points" type="geojson" data={clusterCollection}>
          <Layer {...CLUSTER_LAYER} />
          <Layer {...CLUSTER_COUNT_LAYER} />
          <Layer {...UNCLUSTERED_LAYER} />
          <Layer {...CITY_LABEL_LAYER} />
        </Source>

        {/* Impact zones — rendered outermost → innermost */}
        {thermalZone && (
          <Source id="thermal-zone" type="geojson" data={thermalZone}>
            <Layer id="thermal-zone-fill" type="fill" paint={{ 'fill-color': '#FFD600', 'fill-opacity': 0.10 * zoneScale }} />
            <Layer id="thermal-zone-line" type="line" paint={{ 'line-color': '#FFD600', 'line-width': 1.5, 'line-blur': 2, 'line-opacity': 0.75 * zoneScale }} />
          </Source>
        )}
        {minorBlastZone && (
          <Source id="minor-blast-zone" type="geojson" data={minorBlastZone}>
            <Layer id="minor-blast-zone-fill" type="fill" paint={{ 'fill-color': '#38BDF8', 'fill-opacity': 0.08 * zoneScale }} />
            <Layer id="minor-blast-zone-line" type="line" paint={{ 'line-color': '#8BD3FF', 'line-width': 1.25, 'line-blur': 1.5, 'line-opacity': 0.70 * zoneScale }} />
          </Source>
        )}
        {blastZone && (
          <Source id="blast-zone" type="geojson" data={blastZone}>
            <Layer id="blast-zone-fill" type="fill" paint={{ 'fill-color': '#FF8800', 'fill-opacity': 0.20 * zoneScale }} />
            <Layer id="blast-zone-line" type="line" paint={{ 'line-color': '#FF8800', 'line-width': 2, 'line-blur': 2.5, 'line-opacity': 0.85 * zoneScale }} />
          </Source>
        )}
        {fireballZone && (
          <Source id="fireball-zone" type="geojson" data={fireballZone}>
            <Layer id="fireball-zone-fill" type="fill" paint={{ 'fill-color': '#FF4400', 'fill-opacity': 0.32 * zoneScale }} />
            <Layer id="fireball-zone-line" type="line" paint={{ 'line-color': '#FF5500', 'line-width': 2.5, 'line-blur': 3, 'line-opacity': 0.90 * zoneScale }} />
          </Source>
        )}
        {craterZone && (
          <Source id="crater-zone" type="geojson" data={craterZone}>
            <Layer id="crater-zone-fill" type="fill" paint={{ 'fill-color': '#FF1A00', 'fill-opacity': 0.60 * zoneScale }} />
            <Layer id="crater-zone-line" type="line" paint={{ 'line-color': '#FF3311', 'line-width': 3, 'line-blur': 4, 'line-opacity': zoneScale }} />
          </Source>
        )}

        {/* Zone text labels — HTML markers inside each ring */}
        {zoneLabels.map((lbl) => (
          <Marker key={lbl.id} longitude={lbl.pos[0]} latitude={lbl.pos[1]} anchor="center">
            <div
              className="pointer-events-none select-none font-orbitron text-[10px] font-bold tracking-widest whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
              style={{ color: lbl.color, textShadow: `0 0 12px ${lbl.color}80, 0 1px 3px #000` }}
            >
              {lbl.text}
            </div>
          </Marker>
        ))}

        {/* Target reticle marker */}
        {location && (
          <Marker longitude={location.lng} latitude={location.lat} anchor="center"
            draggable={simulationStatus === 'idle'}
            onDragEnd={(e) => {
              if (simulationStatus !== 'idle') return;
              const { lat, lng } = e.lngLat;
              void reverseGeocode(lat, lng).then((name) => setLocation({ lat, lng, name: name ?? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°` }));
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className="animate-target-ring absolute h-10 w-10 rounded-full border-2 border-red-500/60" />
              <div className="animate-target-ring absolute h-10 w-10 rounded-full border border-orange-400/40" style={{ animationDelay: '0.7s' }} />
              <div className="absolute h-px w-5 bg-red-400/70" />
              <div className="absolute h-5 w-px bg-red-400/70" />
              <div className="relative h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9),0_0_20px_rgba(239,68,68,0.4)]" />
            </div>
          </Marker>
        )}
      </Map>

      {/* ══ IMPACT ZONE LEGEND ══ — top-left of map area */}
      {zonesVisible && results && (
        <div className="glass-sm pointer-events-none absolute left-3 top-3 z-10 rounded-xl p-3 animate-fadeInUp min-w-[190px]">
          <p className="mb-2 text-[12px] font-semibold text-white">Damage zones</p>
          <div className="space-y-1.5">
            {[
              { color: '#FF1A00', label: targetMaterial === 'water' ? '🌊 Water cavity' : '🕳️ Crater', r: results.craterDiameter / 2 },
              { color: '#FF4400', label: '🔥 Fireball',    r: results.fireballRadius },
              { color: '#FF8800', label: '💨 Shockwave',   r: results.blastRadius },
              { color: '#8BD3FF', label: '🪟 Windows',     r: results.minorBlastRadius },
              { color: '#FFD600', label: '🌡️ Heat blast',  r: results.thermalRadius },
            ].filter(({ r }) => r > 0).map(({ color, label, r }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
                <span className="text-[11px] text-slate-300 flex-1">{label}</span>
                <span className="font-mono text-[10px] text-slate-500 ml-2">{r >= 1000 ? `${(r/1000).toFixed(1)} km` : `${Math.round(r)} m`}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] text-slate-600 leading-relaxed">
            Rings show central screening radii; effects are roughly ±{results.uncertaintyFactor}x. Drag the 🎯 to move where it hits.
          </p>
        </div>
      )}

      {/* Map error */}
      {mapError && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="glass rounded-xl border border-amber-500/30 px-5 py-3 text-sm text-amber-200">{mapError}</div>
        </div>
      )}

      {/* Click hint when no location set */}
      {!location && simulationStatus === 'idle' && mapReady && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <div className="glass-sm rounded-full px-4 py-2 text-[11px] text-slate-400">
            Tap any spot to drop the asteroid there
          </div>
        </div>
      )}
    </div>
  );
}
