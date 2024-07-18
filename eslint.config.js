const antfu = require('@antfu/eslint-config');
const fileNamesConfig = require('./eslint/file-names');
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
    ignores: [ 'test/assets/*', '**/*.md' ],
    typescript: {
      tsconfigPath: [ './tsconfig.json', './scripts/tsconfig.json', './test/tsconfig.json' ],
    },
  },
)
  .append(generalConfig)
  .append(unicornConfig)
  .append(fileNamesConfig)
  // Using an override here so all the type settings are also applied correctly
  .override('antfu/typescript/rules-type-aware', typedConfig)
  .append({
    ...testConfig,
    files: [ 'test/**/*.ts' ],
  })
  .override('antfu/jsonc/rules', {
    rules: {
      // Consistent with how we do it in code
      'jsonc/array-bracket-spacing': [ 'error', 'always', {
        singleValue: true,
        objectsInArrays: false,
        arraysInArrays: false,
      }],
    },
  })
  .append({
    // This is necessary to prevent filename checks caused by JSON being present in a README.
    files: [ '**/README.md/**' ],
    rules: {
      'unicorn/filename-case': 'off',
    },
  })
  .override('antfu/markdown/parser', {
    rules: {
      // We want to be able to use these in Markdown text
      'no-irregular-whitespace': 'off',
    },
  });
