import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages: https://Mashi0921.github.io/Grouping/
  base: '/Grouping/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'node',
  },
});
