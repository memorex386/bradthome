import astro from 'eslint-plugin-astro'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

// ESLint for the site and the repo's scripts (FR-008). It runs from the root
// with --config apps/site/eslint.config.js, so the plugins resolve from the
// site's packages, which hold the TypeScript 6 API they need. The locked spec
// tests in tests/ aren't linted.
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.astro/**', '**/node_modules/**'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.astro'] } },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
