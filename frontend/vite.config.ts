import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Development proxy: the browser talks to the Vite origin and Vite forwards
 * API calls to the FastAPI backend, so no CORS configuration is needed locally.
 * For a separately hosted production build, set VITE_API_BASE_URL and add the
 * SPA origin to DATAGUARD_ALLOWED_ORIGINS on the backend (HTTPS only in production).
 */
const BACKEND = 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs let the build be hosted at any path (e.g. /app/).
  base: './',
  server: {
    port: 3000,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: false },
      '/health': { target: BACKEND, changeOrigin: false },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
