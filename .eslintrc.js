/* eslint-disable @typescript-eslint/naming-convention */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [ './tsconfig.json', './test/tsconfig.json' ],
  },
  // Ignoring js files (such as this one) since they seem to conflict with rules that require typing info
  ignorePatterns: [ '*.js' ],
  globals: {
    AsyncIterable: 'readonly',
    NodeJS: 'readonly',
    RequestInit: 'readonly',
  },
  plugins: [
    'tsdoc',
    'import',
    'unused-imports',
  ],
  extends: [
    'es/node',
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        // Always try to resolve types under `<root>@types` directory
        // even it doesn't contain any source code, like `@types/rdf-js`
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    // There are valid typing reasons to have one or the other
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/lines-between-class-members': [ 'error', { exceptAfterSingleLine: true }],
    '@typescript-eslint/no-empty-interface': 'off',
    // Breaks with default void in AsyncHandler 2nd generic
    '@typescript-eslint/no-invalid-void-type': 'off',
    // Problems with optional parameters
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/promise-function-async': [ 'error', { checkArrowFunctions: false } ],
    '@typescript-eslint/space-before-function-paren': [ 'error', 'never' ],
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/unified-signatures': 'off',
    // Conflicts with functions from interfaces that sometimes don't require `this`
    'class-methods-use-this': 'off',
    'comma-dangle': [ 'error', 'always-multiline' ],
    'dot-location': [ 'error', 'property' ],
    'eslint-comments/disable-enable-pair': 'off',
    // Allow declaring overloads in TypeScript (https://eslint.org/docs/rules/func-style)
    'func-style': [ 'error', 'declaration' ],
    'generator-star-spacing': [ 'error', 'after' ],
    // Conflicts with padded-blocks
    'lines-around-comment': 'off',
    'lines-between-class-members': [ 'error', 'always', { exceptAfterSingleLine: true }],
    'max-len': [ 'error', { code: 120, ignoreUrls: true }],
    // Used for RDF constants
    'new-cap': 'off',
    // Necessary in constructor overloading
    'no-param-reassign': 'off',
    // Checked by @typescript-eslint/no-redeclare
    'no-redeclare': 'off',
    // Conflicts with external libraries
    'no-underscore-dangle': 'off',
    // Already checked by @typescript-eslint/no-unused-vars
    'no-unused-vars': 'off',
    'padding-line-between-statements': 'off',
    'prefer-named-capture-group': 'off',
    // Already generated by TypeScript
    strict: 'off',
    'tsdoc/syntax': 'error',
    'unicorn/catch-error-name': 'off',
    'unicorn/import-index': 'off',
    'unicorn/import-style': 'off',
    // The next 2 some functional programming paradigms
    'unicorn/no-array-callback-reference': 'off',
    'unicorn/no-fn-reference-in-iterator': 'off',
    'unicorn/no-object-as-default-parameter': 'off',
    'unicorn/numeric-separators-style': 'off',
    // At function only supported in Node v16.6.0
    'unicorn/prefer-at': 'off',
    // Does not make sense for more complex cases
    'unicorn/prefer-object-from-entries': 'off',
    // Can get ugly with large single statements
    'unicorn/prefer-ternary': 'off',
    'yield-star-spacing': [ 'error', 'after' ],

    // Need to use the typescript version of this rule to support overloading
    "no-dupe-class-members": "off",
    "@typescript-eslint/no-dupe-class-members": ["error"],

    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: [ 'camelCase' ],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
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

    // Import
    '@typescript-eslint/consistent-type-imports': [ 'error', { prefer: 'type-imports' }],
    // Disabled in favor of eslint-plugin-import
    'sort-imports': 'off',
    'import/order': [ 'error', {
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-duplicates': 'error',
    'import/no-extraneous-dependencies': 'error',
    // Doesn't work with type imports
    'no-duplicate-imports': 'off',
    'unused-imports/no-unused-imports-ts': 'error',
  },

  overrides: [
    {
      files: '*.js',
      parser: 'espree',
    },
  ],
};
