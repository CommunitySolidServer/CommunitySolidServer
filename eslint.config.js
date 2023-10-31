const antfu = require('@antfu/eslint-config').default;
const generalConfig = require('./eslint/general');
const testConfig = require('./eslint/test');
const typedConfig = require('./eslint/typed');
const unicornConfig = require('./eslint/unicorn');

const configs = antfu(
  {
    // Don't want to lint test assets, or TS snippets in markdown files
    ignores: [ 'test/assets/*', '**/*.md/**/*.ts' ],
  },
  generalConfig,
  unicornConfig,
  typedConfig({
    project: [ './tsconfig.json', './scripts/tsconfig.json', './test/tsconfig.json' ],
    tsconfigRootDir: __dirname,
  }),
  testConfig,
  {
    // JSON rules
    files: [ '**/*.json' ],
    rules: {
      'jsonc/array-bracket-spacing': [ 'error', 'always', {
        singleValue: true,
        objectsInArrays: false,
        arraysInArrays: false,
      }],
    },
  },
  {
    // This is necessary to prevent filename checks caused by JSON being present in a README.
    files: [ '**/README.md/**' ],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
);

// The default ignore list contains all `output` folders, which conflicts with our src/http/output folder
// See https://github.com/antfu/eslint-config/blob/29f29f1e16d0187f5c870102f910d798acd9b874/src/globs.ts#L53
if (!configs[1].ignores.includes('**/output')) {
  throw new Error('Unexpected data in config position. Check if antfu changed how it handles ignores.');
}
delete configs[1].ignores;

module.exports = configs;
