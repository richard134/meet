import type { MetadataRoute } from 'next';

// Lets the site be added to the Home Screen, which iPhones and iPads require
// before they allow Web Push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Share',
    short_name: 'Share',
    start_url: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#070707',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
