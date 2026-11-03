import { defineConfig } from 'vitest/config'

// Each spec's tests live in tests/NNN/ (D78). The unit project holds unit/ and
// static/, which the Stop hook runs. Some static tests start git and node once
// per locked spec, which Windows runners do slowly, so the unit project allows
// 30 seconds a test (#13). The integration project runs real git, so it starts
// after the unit project and runs its files one at a time, which keeps the
// timing checks steady.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/*/unit/**/*.test.ts', 'tests/*/static/**/*.test.ts'],
          testTimeout: 30_000,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/*/integration/**/*.test.ts'],
          fileParallelism: false,
          testTimeout: 120_000,
          hookTimeout: 120_000,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
})
