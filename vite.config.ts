import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Arena',
        short_name: 'Arena',
        description: 'Compete. Win. Repeat.',
        theme_color: '#0A0A0F',
        background_color: '#0A0A0F',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      // Precache the app shell + assets and serve index.html for any navigation
      // so a hard refresh (or deep link) works OFFLINE — the SPA router then takes
      // over and offline Speed Math / Memory play with no network.
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // TEMPORARY — dev proxy + open host for real-device / HTTPS-tunnel testing.
  // Lets the frontend call a same-origin /api path (proxied to the local
  // backend), so one tunnel covers everything. Revert (remove this block) after.
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:2345', changeOrigin: true },
      // Real-time duel socket — same single origin, forwarded to the backend so
      // live duels work through a phone/tunnel too (ws:true handles the upgrade).
      '/socket.io': { target: 'http://localhost:2345', ws: true, changeOrigin: true },
    },
  },
});
