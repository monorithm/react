import { defineConfig } from 'vitest/config'

// The tests run in jsdom. Each test name of a component starts with the id of the clause of its contract.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'emit/**/*.test.ts', 'test/browser/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
  },
})
