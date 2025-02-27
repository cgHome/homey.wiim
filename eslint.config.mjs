import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  js.configs.recommended,
  {
    ignores: ['**/.homeybuild/', '**/node_modules/', 'eslint.config.*'],
  },
  ...compat.extends('athom'),
  {
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {
      'quotes': ['error', 'single'],
      'no-nested-ternary': 'off',
      'no-unused-vars': 'warn',
      'no-unused-expressions': 'warn',
      'node/no-exports-assign': 'off',
      'node/no-deprecated-api': 'off',
      'node/no-extraneous-require': 'off',
      'node/no-missing-require': 'off',
      'node/no-unpublished-require': 'off',
      'node/no-unsupported-features/es-builtins': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-unsupported-features/node-builtins': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
];
