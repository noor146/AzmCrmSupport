module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  testTimeout: 15000,
};
