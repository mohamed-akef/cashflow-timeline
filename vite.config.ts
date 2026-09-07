import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Node >= 25 enables the experimental Web Storage API by default; its
    // globalThis.localStorage getter shadows jsdom's and returns undefined.
    // Disabling it in the workers lets jsdom's localStorage win. The flag has
    // existed since Node 22.4; if a future Node removes it, drop these lines
    // and re-pin globalThis.localStorage in src/test/setup.ts instead.
    pool: 'forks',
    poolOptions: {
      forks: { execArgv: ['--no-experimental-webstorage'] },
    },
  },
});
