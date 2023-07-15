// eslint-disable-next-line import/no-extraneous-dependencies
const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper(
    {
      '#tests/*': ['./tests/*'],
    },
    {
      prefix: '<rootDir>',
    }
  ),
  globalSetup: './src/setup.ts',
  globalTeardown: './src/teardown.ts',
};
