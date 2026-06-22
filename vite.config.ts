import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Wilder Chestnuts Farm Map',
        short_name: 'FarmMap',
        description: 'Chestnut tree and planting inventory map',
        theme_color: '#2f4f2f',
        background_color: '#f6f3ec',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // App shell + tile imagery can be large; only precache our own bundle,
        // map tiles/overlay images are fetched live (and browser-cached) since
        // they're not essential for the app to boot offline.
        globPatterns: ['**/*.{js,css,html,svg}']
      }
    })
  ]
});
