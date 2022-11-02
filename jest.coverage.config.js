const jestConfig = require('./jest.config');

module.exports = {
  ...jestConfig,
  collectCoverage: true,
  coverageReporters: [ 'text', 'lcov' ],
  coveragePathIgnorePatterns: [
    '/dist/',
    '/node_modules/',
    '/test/',
  ],
  coverageThreshold: {
    './src': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
