import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Copy manifest.json to dist after build
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    writeBundle() {
      fs.copyFileSync(
        path.resolve(__dirname, 'manifest.json'),
        path.resolve(__dirname, 'dist/manifest.json')
      );
    },
  };
}

export default defineConfig({
  plugins: [copyManifestPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
