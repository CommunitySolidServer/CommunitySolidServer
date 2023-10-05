const os = require('os');
const v8 = require('v8');

// Several parts inspired by https://github.com/renovatebot/renovate/blob/main/package.json

const ci = !!process.env.CI;

const cpus = os.cpus();
const mem = os.totalmem();
const stats = v8.getHeapStatistics();

if (ci) {
  process.stderr.write(`Host stats:
  Cpus:      ${cpus.length}
  Memory:    ${(mem / 1024 / 1024 / 1024).toFixed(2)} GB
  HeapLimit: ${(stats.heap_size_limit / 1024 / 1024 / 1024).toFixed(2)} GB
`);
}

// See also https://github.com/jestjs/jest/issues/11956
function jestGithubRunnerSpecs() {
  return {
    maxWorkers: cpus.length,
    workerIdleMemoryLimit: '1500MB',
  };
}

module.exports = {
  transform: {
    '^.+\\.ts$': [ 'ts-jest', {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: false,
        isolatedModules: true,
    }],
  },
  testRegex: '/test/(unit|integration)/.*\\.test\\.ts$',
  moduleFileExtensions: [
    'ts',
    'js',
  ],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/util/SetupTests.ts',
  globalTeardown: '<rootDir>/test/util/TeardownTests.ts',
  setupFilesAfterEnv: [ 'jest-rdf' ],
  collectCoverage: false,
  // See https://github.com/matthieubosquet/ts-dpop/issues/13
  moduleNameMapper: {
    '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
  },
  // Slower machines had problems calling the WebSocket integration callbacks on time
  testTimeout: 60000,

  reporters: ci ? ['default', 'github-actions'] : ['default'],
  ...(ci && jestGithubRunnerSpecs()),
};
