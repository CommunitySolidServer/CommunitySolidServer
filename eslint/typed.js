module.exports = {
  rules: {
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
  },
};
