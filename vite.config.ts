import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // De app staat op https://codebearpear.github.io/lingua-atlas/
  base: '/lingua-atlas/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Een nieuwe versie wordt pas actief als je op "Vernieuwen" tikt.
      registerType: 'prompt',
      manifest: {
        id: '/lingua-atlas/',
        name: 'Lingua Atlas',
        short_name: 'Lingua Atlas',
        description:
          'Persoonlijke taalleerapp met Nederlands als instructietaal.',
        lang: 'nl',
        theme_color: '#13233a',
        background_color: '#13233a',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Bewaar alle bestanden van de app, zodat hij offline compleet is.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
