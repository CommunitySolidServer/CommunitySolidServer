module.exports = {
  testRegex: '/test/(unit|integration)/.*\\.test\\.ts$',
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: [ 'jest-rdf', '<rootDir>/test/util/SetupTests.ts' ],
  collectCoverage: false,
  // See https://github.com/matthieubosquet/ts-dpop/issues/13
  moduleNameMapper: {
    '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
  },
  // Slower machines had problems calling the WebSocket integration callbacks on time
  testTimeout: 60000,
  preset: 'ts-jest',
};
