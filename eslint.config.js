const antfu = require('@antfu/eslint-config');
const generalConfig = require('./eslint/general');
const testConfig = require('./eslint/test');
const typedConfig = require('./eslint/typed');
const unicornConfig = require('./eslint/unicorn');

// The default ignore list contains all `output` folders, which conflicts with our src/http/output folder
// See https://github.com/antfu/eslint-config/blob/7071af7024335aad319a91db41ce594ebc6a0899/src/globs.ts#L55
const index = antfu.GLOB_EXCLUDE.indexOf('**/output');
if (index < 0) {
  throw new Error('Could not update GLOB_EXCLUDE. Check if antfu changed how it handles ignores.');
}
antfu.GLOB_EXCLUDE.splice(index, 1);

module.exports = antfu.default(
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
