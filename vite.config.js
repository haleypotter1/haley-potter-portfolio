import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

function resolvePath(path) {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@js': resolvePath('./src/js'),
      '@css': resolvePath('./src/css'),
      '@data': resolvePath('./src/data'),
      '@three': resolvePath('./src/js/three'),
      '@fitness': resolvePath('./src/js/fitness'),
      '@travelMap': resolvePath('./src/js/travelMap'),
      '@utils': resolvePath('./src/js/utils'),
    },
  },
  server: {
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-gsap': ['gsap'],
          'vendor-chart': ['chart.js'],
        },
      },
    },
  },
});
