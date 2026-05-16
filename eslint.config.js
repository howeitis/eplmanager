import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Files allowed to call Math.random directly. The seeded-RNG rule in
// CLAUDE.md carves these out for cosmetic-only randomness (particle
// systems, decorative jitter) plus the initial game-seed bootstrap.
const MATH_RANDOM_ALLOWLIST = [
  'src/utils/rng.ts',
  'src/components/shared/Confetti.tsx',
  'src/components/shared/PackOpening.tsx',
  'src/App.tsx',
]

// Type-checked rules that surface real signal but match pre-existing
// shapes in this codebase. Kept as warnings so they show up in lint
// output and CI as backlog, without breaking the build. Promote to
// `error` as each is paid down.
const TYPE_CHECKED_WARN = {
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/no-unsafe-member-access': 'warn',
  '@typescript-eslint/no-unsafe-argument': 'warn',
  '@typescript-eslint/no-unsafe-call': 'warn',
  '@typescript-eslint/no-unsafe-return': 'warn',
  '@typescript-eslint/no-floating-promises': 'warn',
  '@typescript-eslint/no-misused-promises': 'warn',
  '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
  '@typescript-eslint/restrict-template-expressions': 'warn',
  '@typescript-eslint/no-base-to-string': 'warn',
  '@typescript-eslint/prefer-promise-reject-errors': 'warn',
  '@typescript-eslint/only-throw-error': 'warn',
  '@typescript-eslint/await-thenable': 'warn',
  '@typescript-eslint/unbound-method': 'warn',
  '@typescript-eslint/require-await': 'warn',
  '@typescript-eslint/no-redundant-type-constituents': 'warn',
}

export default defineConfig([
  globalIgnores(['dist', 'dist-lib', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...TYPE_CHECKED_WARN,
      // React Compiler-era rules (react-hooks v7) flag real but pre-existing
      // patterns. Classic strict rules (rules-of-hooks, exhaustive-deps)
      // stay as errors; compiler enforcement is surfaced as warnings to
      // track without blocking CI. Promote per-rule as code is paid down.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'Use SeededRNG from @/utils/rng for gameplay randomness. If this is purely cosmetic, add the file to MATH_RANDOM_ALLOWLIST in eslint.config.js.',
        },
      ],
      // Honor the existing `_`-prefix convention for intentionally
      // unused signature parameters and destructured slots.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: MATH_RANDOM_ALLOWLIST,
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Save migration intentionally accepts arbitrary disk shapes as `any`
    // and validates progressively. The unsafe-* family flags those flows
    // by design — silenced here because the boundary is the point.
    files: ['src/utils/save.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // The package's public entry re-exports both the component and a few
    // configuration helpers — by design. Fast-refresh isn't relevant here.
    files: ['src/lib.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Test files: drop the unsafe-* family entirely; fixtures need flex.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
])
