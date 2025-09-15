import js from '@eslint/js';
import { fixupConfigRules } from '@eslint/compat';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      js.configs.recommended,
      ...fixupConfigRules(tseslint.configs.recommended),
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
  }
);