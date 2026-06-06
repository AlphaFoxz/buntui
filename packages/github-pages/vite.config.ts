import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: '/buntui/',
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: ['@buntui/core', '@buntui/playground-wasm'],
  },
});
