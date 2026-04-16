import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { build as esbuild } from 'esbuild';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-assets',
      // Use closeBundle (runs after emitFile) so we can overwrite content scripts
      async closeBundle() {
        // Stamp manifest with version from package.json
        const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
        const manifest = JSON.parse(readFileSync(resolve(__dirname, 'manifest.json'), 'utf-8'));
        manifest.version = pkg.version;
        // Remove "type": "module" from content_scripts — not supported by Chrome
        if (manifest.content_scripts) {
          for (const cs of manifest.content_scripts) {
            delete cs.type;
          }
        }
        writeFileSync(resolve(__dirname, 'dist/manifest.json'), JSON.stringify(manifest, null, 2));

        // Copy icons
        const iconsDir = resolve(__dirname, 'icons');
        const distIconsDir = resolve(__dirname, 'dist/icons');
        mkdirSync(distIconsDir, { recursive: true });
        for (const f of readdirSync(iconsDir)) {
          copyFileSync(resolve(iconsDir, f), resolve(distIconsDir, f));
        }

        // Rebundle content scripts as self-contained IIFEs using esbuild.
        // Vite builds them as ES modules with dynamic chunk imports, which
        // Chrome cannot execute when injecting as classic content scripts.
        const contentScripts = [
          { entry: 'src/content/content.ts',          out: 'dist/content.js' },
          { entry: 'src/content/claude-injector.ts',  out: 'dist/claude-injector.js' },
          { entry: 'src/background/background.ts',    out: 'dist/background.js' },
        ];

        for (const { entry, out } of contentScripts) {
          await esbuild({
            entryPoints: [resolve(__dirname, entry)],
            bundle: true,
            format: 'iife',
            platform: 'browser',
            target: 'chrome110',
            outfile: resolve(__dirname, out),
            // Silence the "import.meta" warning — not needed in IIFE
            define: { 'import.meta.url': '"chrome-extension://rsvp-reader"' },
            logLevel: 'warning',
          });
          console.log(`[extension] Bundled ${entry} → ${out} (IIFE)`);
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
        reader: resolve(__dirname, 'reader.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        format: 'es',
      },
    },
  },
  resolve: {
    alias: {
      '@rsvp-reader/web': resolve(__dirname, '../web/src'),
    },
  },
});
