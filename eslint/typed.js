// Copied from https://github.com/antfu/eslint-config/blob/main/src/configs/typescript.ts
// Doing it like this, so we can make sure these only try to trigger on *.ts files,
// Preventing issues with the *.js files.
const typeAwareRules = {
  'dot-notation': 'off',
  'no-implied-eval': 'off',
  'no-throw-literal': 'off',
  'ts/await-thenable': 'error',
  'ts/dot-notation': [ 'error', { allowKeywords: true }],
  'ts/no-floating-promises': 'error',
  'ts/no-for-in-array': 'error',
  'ts/no-implied-eval': 'error',
  'ts/no-misused-promises': 'error',
  'ts/no-throw-literal': 'error',
  'ts/no-unnecessary-type-assertion': 'error',
  'ts/no-unsafe-argument': 'error',
  'ts/no-unsafe-assignment': 'error',
  'ts/no-unsafe-call': 'error',
  'ts/no-unsafe-member-access': 'error',
  'ts/no-unsafe-return': 'error',
  'ts/restrict-plus-operands': 'error',
  'ts/restrict-template-expressions': 'error',
  'ts/unbound-method': 'error',
};

const defaults = {
  project: [ './tsconfig.json' ],
  files: [ '**/*.ts' ],
  tsconfigRootDir: process.cwd(),
};

module.exports = function(options) {
  options = { ...defaults, ...options };
  return {
    // By default, antfu also triggers type rules on *.js files which causes all kinds of issues for us
    files: options.files,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: options.tsconfigRootDir,
        project: options.project,
      },
    },
    rules: {
      ...typeAwareRules,
      'ts/consistent-type-assertions': [ 'error', {
        assertionStyle: 'as',
      }],
      'ts/naming-convention': [
        'error',
        {
          selector: 'default',
          format: [ 'camelCase' ],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'import',
          format: null,
        },
        {
          selector: 'variable',
          format: [ 'camelCase', 'UPPER_CASE' ],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'typeLike',
          format: [ 'PascalCase' ],
        },
        {
          selector: [ 'typeParameter' ],
          format: [ 'PascalCase' ],
          prefix: [ 'T' ],
        },
      ],
      'ts/explicit-function-return-type': [ 'error', {
        allowExpressions: false,
        allowTypedFunctionExpressions: false,
        allowHigherOrderFunctions: false,
      }],
      'ts/no-base-to-string': 'error',
      'ts/no-floating-promises': [ 'error', { ignoreVoid: false }],
      'ts/promise-function-async': 'error',
      'ts/no-unnecessary-boolean-literal-compare': 'error',
      'ts/no-unnecessary-qualifier': 'error',
      'ts/prefer-nullish-coalescing': 'error',
      'ts/prefer-readonly': 'error',
      'ts/prefer-reduce-type-parameter': 'error',
      'ts/prefer-regexp-exec': 'error',
      'ts/prefer-string-starts-ends-with': 'error',
      'ts/require-array-sort-compare': 'error',

      // These are not type specific, but we only care about these in TS files
      'max-len': [ 'error', { code: 120, ignoreUrls: true }],
      'unicorn/filename-case': [ 'error', {
        cases: {
          camelCase: true,
          pascalCase: true,
          kebabCase: false,
          snakeCase: false,
        },
      }],
    },
  };
};
