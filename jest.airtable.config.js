const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.base.json');

module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: 'apps/backend/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/.nx/cache'],
  setupFilesAfterEnv: ['<rootDir>/apps/backend/src/test-setup.ts'],
  testMatch: ['<rootDir>/apps/backend/src/airtable/airtable.service.spec.ts'],
  coverageDirectory: '<rootDir>/coverage/apps/backend-airtable',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/backend-airtable',
  maxWorkers: 1,
  testTimeout: 30000,
};
