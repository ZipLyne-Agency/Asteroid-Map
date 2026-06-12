import { createBrandOgImage, OG_SIZE } from '@/lib/og-brand-image';

export const runtime = 'edge';

export const alt =
  'Asteroid Impact Simulator — interactive Earth map with modeled airburst or crater, blast, and thermal zones';

export const size = OG_SIZE;

export const contentType = 'image/png';

export default async function TwitterImage() {
  return createBrandOgImage();
}
