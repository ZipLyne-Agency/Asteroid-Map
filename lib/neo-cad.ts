import { formatDistanceToNowStrict } from 'date-fns';
import { z } from 'zod';

const AU_IN_KM = 149_597_870.7;
export const SUPPORTED_CAD_API_VERSION = '1.5';

export const CadResponseSchema = z.object({
  signature: z.object({
    source: z.string(),
    version: z.string(),
  }),
  count: z.number().int().nonnegative(),
  fields: z.array(z.string()),
  data: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).optional(),
});

export type CadPayload = z.infer<typeof CadResponseSchema>;

export interface ParsedApproach {
  id: string;
  name: string;
  date: string;
  dateIso: string;
  relativeTime: string;
  approachType: 'past' | 'upcoming';
  diameter: number;
  diameterEstimated: boolean;
  diameterMin?: number;
  diameterMax?: number;
  diameterSigma?: number;
  velocity: number;
  velocityBasis: 'flyby-relative' | 'hyperbolic-excess';
  missDistanceKm: number;
  missDistance: string;
  missDistanceMinKm?: number;
  missDistanceMaxKm?: number;
  missDistanceRange?: string;
  approachTimeUncertainty?: string;
  composition: 'ice' | 'porous_rock' | 'dense_rock' | 'iron';
  compositionAssumed: boolean;
  sourceName: string;
  sourceUrl: string;
  inputUncertainty: string;
  source: 'jpl-cad';
}

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function estimateDiameterMeters(hMagnitude: number, albedo = 0.14): number {
  const diameterKm = (1329 / Math.sqrt(albedo)) * Math.pow(10, -hMagnitude / 5);
  return diameterKm * 1000;
}

function pickComposition(diameterMeters: number): 'ice' | 'porous_rock' | 'dense_rock' | 'iron' {
  if (diameterMeters >= 1000) return 'dense_rock';
  if (diameterMeters >= 250) return 'porous_rock';
  // Composition is not derivable from CAD size fields; default small objects to stony.
  return 'dense_rock';
}

function formatDistance(missDistanceKm: number): string {
  const lunarDistance = missDistanceKm / 384400;
  const au = missDistanceKm / AU_IN_KM;
  if (lunarDistance < 2) return `${lunarDistance.toFixed(2)} LD`;
  if (au < 0.02) return `${au.toFixed(4)} AU`;
  return `${Math.round(missDistanceKm).toLocaleString()} km`;
}

function formatDistanceRange(missDistanceMinKm: number, missDistanceMaxKm: number): string | undefined {
  if (!Number.isFinite(missDistanceMinKm) || !Number.isFinite(missDistanceMaxKm) || missDistanceMaxKm <= missDistanceMinKm) {
    return undefined;
  }
  return `${formatDistance(missDistanceMinKm)}-${formatDistance(missDistanceMaxKm)}`;
}

function julianToIso(jd: number): string {
  if (!Number.isFinite(jd)) return new Date().toISOString();
  return new Date((jd - 2440587.5) * 86400000).toISOString();
}

function relativeLabel(dateIso: string, approachType: 'past' | 'upcoming'): string {
  const value = formatDistanceToNowStrict(new Date(dateIso), { addSuffix: false });
  return approachType === 'past' ? `${value} ago` : `in ${value}`;
}

export function parseCadPayload(
  payload: CadPayload,
  approachType: 'past' | 'upcoming',
): ParsedApproach[] {
  if (!payload.data?.length) return [];

  const fieldIndex = new Map(payload.fields.map((field, index) => [field, index]));

  return payload.data
    .map((row): ParsedApproach | null => {
      const des = row[fieldIndex.get('des') ?? -1];
      const fullname = row[fieldIndex.get('fullname') ?? -1];
      const date = row[fieldIndex.get('cd') ?? -1];
      const jd = toNumber(row[fieldIndex.get('jd') ?? -1], Number.NaN);
      const relativeVelocity = toNumber(row[fieldIndex.get('v_rel') ?? -1], Number.NaN);
      const vInfinity = toNumber(row[fieldIndex.get('v_inf') ?? -1], Number.NaN);
      const hMagnitude = toNumber(row[fieldIndex.get('h') ?? -1], Number.NaN);
      const diameterKm = toNumber(row[fieldIndex.get('diameter') ?? -1], 0);
      const diameterSigmaKm = toNumber(row[fieldIndex.get('diameter_sigma') ?? -1], 0);
      const distAu = toNumber(row[fieldIndex.get('dist') ?? -1], Number.NaN);
      const distMinAu = toNumber(row[fieldIndex.get('dist_min') ?? -1], Number.NaN);
      const distMaxAu = toNumber(row[fieldIndex.get('dist_max') ?? -1], Number.NaN);
      const timeUncertainty = row[fieldIndex.get('t_sigma_f') ?? -1];

      const hasKnownDiameter = Number.isFinite(diameterKm) && diameterKm > 0;
      const hasEstimatedDiameter = Number.isFinite(hMagnitude);
      const hasVelocity = (Number.isFinite(vInfinity) && vInfinity > 0) || (Number.isFinite(relativeVelocity) && relativeVelocity > 0);
      if (
        !des || typeof des !== 'string' ||
        !date || typeof date !== 'string' ||
        !Number.isFinite(jd) || !Number.isFinite(distAu) || distAu < 0 ||
        (!hasKnownDiameter && !hasEstimatedDiameter) || !hasVelocity
      ) {
        return null;
      }

      const diameterEstimated = !hasKnownDiameter;
      const diameterMeters = diameterEstimated ? estimateDiameterMeters(hMagnitude) : diameterKm * 1000;
      const velocity = Number.isFinite(vInfinity) && vInfinity > 0 ? vInfinity : relativeVelocity;
      const velocityBasis = Number.isFinite(vInfinity) && vInfinity > 0 ? 'hyperbolic-excess' : 'flyby-relative';
      const diameterSigma = !diameterEstimated && diameterSigmaKm > 0 ? diameterSigmaKm * 1000 : undefined;
      const diameterMin = diameterEstimated
        ? estimateDiameterMeters(hMagnitude, 0.25)
        : diameterSigma
          ? Math.max(1, diameterMeters - diameterSigma)
          : undefined;
      const diameterMax = diameterEstimated
        ? estimateDiameterMeters(hMagnitude, 0.05)
        : diameterSigma
          ? diameterMeters + diameterSigma
          : undefined;
      const missDistanceKm = Number.isFinite(distAu) ? distAu * AU_IN_KM : 0;
      const missDistanceMinKm = Number.isFinite(distMinAu) ? distMinAu * AU_IN_KM : undefined;
      const missDistanceMaxKm = Number.isFinite(distMaxAu) ? distMaxAu * AU_IN_KM : undefined;
      const missDistanceRange = missDistanceMinKm !== undefined && missDistanceMaxKm !== undefined
        ? formatDistanceRange(missDistanceMinKm, missDistanceMaxKm)
        : undefined;
      const approachTimeUncertainty = typeof timeUncertainty === 'string' && timeUncertainty.trim()
        ? timeUncertainty.trim()
        : undefined;
      const resolvedName = typeof fullname === 'string' && fullname.trim().length > 0 ? fullname.trim() : des;
      const dateIso = julianToIso(jd);

      return {
        id: des,
        name: resolvedName,
        date,
        dateIso,
        relativeTime: relativeLabel(dateIso, approachType),
        approachType,
        diameter: diameterMeters,
        diameterEstimated,
        ...(diameterMin && diameterMax ? { diameterMin, diameterMax } : {}),
        ...(diameterSigma ? { diameterSigma } : {}),
        velocity,
        velocityBasis,
        missDistanceKm,
        missDistance: formatDistance(missDistanceKm),
        ...(missDistanceMinKm !== undefined ? { missDistanceMinKm } : {}),
        ...(missDistanceMaxKm !== undefined ? { missDistanceMaxKm } : {}),
        ...(missDistanceRange ? { missDistanceRange } : {}),
        ...(approachTimeUncertainty ? { approachTimeUncertainty } : {}),
        composition: pickComposition(diameterMeters),
        compositionAssumed: true,
        sourceName: 'NASA/JPL SBDB Close-Approach Data',
        sourceUrl: 'https://ssd-api.jpl.nasa.gov/doc/cad.html',
        inputUncertainty: diameterEstimated
          ? `CAD provides a close-approach flyby; diameter is estimated from absolute magnitude and an assumed albedo range, and modeled entry speed ${velocityBasis === 'hyperbolic-excess' ? 'uses CAD v-infinity with Earth-gravity focusing' : 'adds Earth-gravity focusing to the close-approach speed'}.`
          : `CAD provides a close-approach flyby; composition is not included, 1-sigma diameter uncertainty is used when supplied, and modeled entry speed ${velocityBasis === 'hyperbolic-excess' ? 'uses CAD v-infinity with Earth-gravity focusing' : 'adds Earth-gravity focusing to the close-approach speed'}.`,
        source: 'jpl-cad',
      };
    })
    .filter((item): item is ParsedApproach => item !== null);
}
