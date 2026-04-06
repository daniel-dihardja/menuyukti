import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  plugins: [],

  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },

  test: {
    passWithNoTests: true,
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    pool: 'threads',

    setupFiles: ['./tests/setup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['lib/**/*.ts'],
    },
  },

  ssr: {
    external: ['xlsx'],
  },
})
