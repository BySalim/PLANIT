import config from '@planit/config/eslint';

export default [
  ...config,
  {
    // NestJS resolves constructor-injected providers from decorator metadata
    // at runtime, so DI imports must stay *value* imports — `import type` would
    // erase them and break dependency injection. `consistent-type-imports`
    // cannot distinguish them from type-only imports without type info, so it
    // is disabled for the application source (it still applies to test/).
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
