const os = require('node:os');
const v8 = require('node:v8');

// Several parts inspired by https://github.com/renovatebot/renovate/blob/main/package.json

const ci = Boolean(process.env.CI);

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

// ESM libraries that need to be transformed so Jest can handle them
const esModules = [
  'oidc-provider',
  'nanoid',
  'got',
  'quick-lru',
  '@sindresorhus/is',
  'p-cancelable',
  '@szmarczak/http-timer',
  'cacheable-request',
  'normalize-url',
  'responselike',
  'lowercase-keys',
  'mimic-response',
  'form-data-encoder',
  'cacheable-lookup',
];

module.exports = {
  transform: {
    '^.+\\.ts$': [ 'ts-jest', {
      tsconfig: '<rootDir>/test/tsconfig.json',
      diagnostics: false,
      isolatedModules: true,
    }],
    // This transformer converts ESM packages to CJS
    '^.+node_modules.+\\.js$': 'jest-esm-transformer-2',
  },
  // By default, node_modules are not transformed, but we want to transform the ESM packages
  transformIgnorePatterns: [ `/node_modules/(?!(${esModules.join('|')})/)` ],
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
  testTimeout: 90000,

  reporters: ci ? [ 'default', 'github-actions' ] : [ 'default' ],
  ...ci && jestGithubRunnerSpecs(),
};
