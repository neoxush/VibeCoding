import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    fs: {
      strict: true,
      allow: [
        // Search for workspace root
        fileURLToPath(new URL('../../..', import.meta.url)),
        // Your custom rules
        '/src/',
        '/public/',
      ]
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
  },
  appType: 'spa',
});