import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work both at / and at /<repository>/ on GitHub Pages.
  base: './',
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          // Keep Pixi's renderer chunks dynamic and isolate only service layers
          // that never depend on rendering or scene initialization.
          if (/\/src\/(analytics|content|events|monetization|platform|progression)\//.test(id)) {
            return 'services';
          }
        },
      },
    },
  },
});
