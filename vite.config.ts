import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// claude.ai 아티팩트로 올릴 한 장짜리 페이지를 만든다 (scripts/build-artifact.mjs가 합침)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
