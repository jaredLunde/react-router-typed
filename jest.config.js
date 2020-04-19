const path = require('path')

module.exports = {
  // testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: [
    'node_modules',
    path.join(__dirname, 'src'),
    path.join(__dirname, 'dom/src'),
    path.join(__dirname, 'server/src'),
    path.join(__dirname, 'test'),
  ],
  testMatch: ['**/src/**/?(*.)test.{ts,tsx}'],
  collectCoverageFrom: ['**/src/**/*.{ts,tsx}', '!**/src/**/*.d.ts'],
  setupFilesAfterEnv: [require.resolve('./test/setup.js')],
  snapshotResolver: require.resolve('./test/resolve-snapshot.js'),
  globals: {
    __DEV__: true,
  },
}
