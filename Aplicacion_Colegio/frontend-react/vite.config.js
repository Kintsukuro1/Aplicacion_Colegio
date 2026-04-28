import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Improve code-splitting to avoid a single large bundle
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/')[1].split('/');
            // Group by top-level package name (scoped packages keep scope)
            const pkg = parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
            return `vendor.${pkg}`;
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    globals: true,
  },
});
