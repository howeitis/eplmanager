/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

/**
 * Library-mode Vite config. Produces an ESM + CJS bundle of src/lib.tsx
 * along with a single style.css containing all Tailwind utilities used
 * across the source tree. React and ReactDOM are externalized — the
 * host site provides them via its own node_modules.
 *
 * Use:  npm run build:lib
 * Output: dist-lib/{lib.es.js, lib.cjs.js, style.css, *.d.ts}
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/lib.tsx', 'src/types/**/*', 'src/data/assets.ts'],
      // Emit a single index.d.ts at the package root so the `types` field
      // in package.json resolves with no extra `exports` plumbing.
      rollupTypes: true,
      tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
    }),
  ],
  // The /public folder is *not* part of the library bundle — host sites
  // copy those files into their own asset directory and point the game
  // there via `assetBasePath` (see INTEGRATION.md). Disabling publicDir
  // keeps dist-lib lean (JS + CSS + types only).
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/lib.tsx'),
      name: 'EPLManager',
      formats: ['es', 'cjs'],
      fileName: (format) => `lib.${format === 'es' ? 'es' : 'cjs'}.js`,
    },
    rollupOptions: {
      // Peer dependencies — the host installs these.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
      ],
      output: {
        // Quiet the mixed-export warning: consumers using CJS will get
        // the named exports without needing `.default`.
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        // Single CSS file. Vite emits this as `style.css` by default.
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'style.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
