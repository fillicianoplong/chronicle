import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import {
  boundaryRules,
  plugin as chronicleBoundaries,
} from './eslint/chronicle-boundaries.js'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'blob-report',
    // Planted violations. The boundary test lints these on purpose.
    'tests/lint/fixtures/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      chronicle: chronicleBoundaries,
    },
    rules: boundaryRules,
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      // Playwright fixture callbacks take a parameter named use.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  prettier,
])
