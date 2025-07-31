export default {
  displayName: 'backend',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/backend',
  collectCoverageFrom: [
    'src/**/*.(ts|js)',
    '!src/**/*.spec.(ts|js)',
    '!src/**/*.test.(ts|js)',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],

  // Resource optimization
  maxWorkers: process.env.CI ? 4 : 2, // Limit workers locally
  workerIdleMemoryLimit: '512MB', // Free memory after each test
  testTimeout: 30000, // 30s timeout

  // Better error reporting with less noise
  // verbose: false, // Not a valid Jest option at this level
  // silent: true, // Not a valid Jest option

  // Cache settings
  cache: true,
  cacheDirectory: '../../.jest-cache/backend',
};
