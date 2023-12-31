const path = require('path');

module.exports = {
  extends: ['@vdtn359/eslint-config'],
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.json'),
  },
  ignorePatterns: ['!.*', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      },
    ],
  },
};
