import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      '.astro',
      '.wrangler',
      'tests/**/*',
      'playwright-report',
      '.superpowers',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,astro}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
    },
  },
];
