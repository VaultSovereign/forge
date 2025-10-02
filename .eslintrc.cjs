/* eslint-env node */
const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat();

module.exports = {
  root: true,
  ignorePatterns: ['**/dist/**', '**/build/**', 'workbench/frontend-dist/**', 'node_modules/**'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    'import/resolver': { typescript: true, node: true },
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'import/no-unresolved': 'off',
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
  },
  overrides: [
    {
      files: ['workbench/frontend/**/*.{ts,tsx,js,jsx}'],
      env: { browser: true, es2022: true },
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:prettier/recommended',
      ],
      settings: { react: { version: 'detect' } },
      rules: { 'react/react-in-jsx-scope': 'off', 'react/prop-types': 'off' },
    },
    {
      files: ['workbench/bff/**/*.{ts,js,cjs,mjs}'],
      env: { node: true, es2022: true },
      rules: {},
    },
    {
      files: ['scripts/**/*.{ts,js,mjs}', 'tests/**/*.{ts,js}', '**/*.spec.{ts,js}'],
      env: { node: true, es2022: true, mocha: true, jest: true },
    },
  ],
};
