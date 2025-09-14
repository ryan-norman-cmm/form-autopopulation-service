import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@form-auto-population/fhir-questionnaire-converter': resolve(
        __dirname,
        '../../libs/fhir-questionnaire-converter/src/index.ts'
      ),
      '@form-auto-population/fhir-client': resolve(
        __dirname,
        '../../libs/fhir-client/src/index.ts'
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.spec.ts'],
    },
  },
});
