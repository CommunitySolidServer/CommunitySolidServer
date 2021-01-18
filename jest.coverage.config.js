const jestConfig = require('./jest.config');

module.exports = {
  ...jestConfig,
  coverageThreshold: {
    './src': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
