/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// Set ANALYZE=1 before `npm run build` to emit dist/stats.html with the
// rolled-up bundle treemap. Skipped by default so normal builds stay quiet.
const analyze = process.env.ANALYZE === '1'

export default defineConfig({
  plugins: [
    react(),
    analyze &&
      visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
