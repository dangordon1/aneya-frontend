import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./src/test/setup.ts'],

    // Global test APIs (describe, it, expect, vi)
    globals: true,

    // Include patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Exclude patterns
    exclude: ['node_modules', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/components/**/*.tsx',
        'src/hooks/**/*.ts',
        'src/utils/**/*.ts',
        'src/contexts/**/*.tsx'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**/*',
        'src/**/*.d.ts',
        'src/types/**/*'
      ],
      thresholds: {
        global: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        }
      }
    },

    // Test timeout
    testTimeout: 10000,

    // CSS handling
    css: true
  }
})
