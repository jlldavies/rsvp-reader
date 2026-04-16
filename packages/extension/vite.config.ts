import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      // Copy manifest.json to dist after build
      name: 'copy-extension-assets',
      writeBundle() {
        // Copy manifest
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
        // Copy icons
        const iconsDir = resolve(__dirname, 'icons');
        const distIconsDir = resolve(__dirname, 'dist/icons');
        mkdirSync(distIconsDir, { recursive: true });
        for (const f of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, f), resolve(distIconsDir, f));
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
    },
  },
  // Make sure @rsvp-reader/core is bundled (not external)
  resolve: {
    alias: {},
  },
});
