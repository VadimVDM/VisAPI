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
};
