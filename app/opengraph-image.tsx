import { createBrandOgImage, OG_SIZE } from '@/lib/og-brand-image';

export const runtime = 'edge';

export const alt =
  'Asteroid Impact Simulator — interactive Earth map with impact crater, blast wave, and thermal heat zones';

export const size = OG_SIZE;

export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return createBrandOgImage();
}
