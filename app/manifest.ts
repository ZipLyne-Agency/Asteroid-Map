import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Asteroid Map',
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#07080f',
    theme_color: '#07080f',
    categories: ['education', 'science', 'utilities'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
