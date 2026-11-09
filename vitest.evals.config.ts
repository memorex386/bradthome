import { defineConfig } from 'vitest/config'

// The eval run's own config (spec 023), apart from vitest.config.ts, so
// `pnpm test` never calls a model. One file, its cases one after another, and
// up to a minute each, the API's own model timeout.
export default defineConfig({
  test: {
    include: ['apps/evals/src/**/*.eval.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
