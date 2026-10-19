import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The repository is named "ATELIER" and GitHub Pages paths are case-sensitive,
// so the default base is "/ATELIER/". Override with VITE_BASE if you rename the repo.
const base = process.env.VITE_BASE ?? '/ATELIER/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'mannequins/*.svg'],
      manifest: {
        name: 'ATELIER — Digital Wardrobe',
        short_name: 'ATELIER',
        description: 'Your personal wardrobe and outfit studio',
        theme_color: '#171715',
        background_color: '#F4F0E8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
});
