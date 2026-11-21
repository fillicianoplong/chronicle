import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

function dropContentSecurityPolicyInDev(): Plugin {
  return {
    name: 'chronicle-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /\s*<meta\s+[^>]*http-equiv="Content-Security-Policy"[\s\S]*?>/gi,
        '',
      )
    },
  }
}

export default defineConfig({
  base: '/chronicle/',
  plugins: [react(), dropContentSecurityPolicyInDev()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        about: fileURLToPath(new URL('./about/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
})
