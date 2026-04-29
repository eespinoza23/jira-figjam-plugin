import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  root: 'ui-src',
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'ui-src/index.html',
    },
  },
});
