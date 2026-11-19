import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages 주소가 /sullog/ 아래라서
  base: '/sullog/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,wasm,png,svg}'], maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 },
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: '술로그',
        short_name: '술로그',
        description: '나만의 술 테이스팅 노트',
        lang: 'ko',
        theme_color: '#1c1714',
        background_color: '#1c1714',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
