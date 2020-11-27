module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.json'],
  },
  globals:  {
    NodeJS: 'readonly'
  },
  plugins: [
    'tsdoc',
    'import',
    'unused-imports',
  ],
  extends: [
    'es/node',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      'typescript': {
        'alwaysTryTypes': true // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/rdf-js`
      },
    }
  },
  rules: {
    '@typescript-eslint/consistent-type-definitions': 'off', // there are valid typing reasons to have one or the other
    '@typescript-eslint/lines-between-class-members': [ 'error', { exceptAfterSingleLine: true }],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-invalid-void-type': 'off', // breaks with default void in Asynchandler 2nd generic
    '@typescript-eslint/no-unnecessary-condition': 'off', // problems with optional parameters
    '@typescript-eslint/space-before-function-paren': [ 'error', 'never' ],
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/unified-signatures': 'off',
    'class-methods-use-this': 'off', // conflicts with functions from interfaces that sometimes don't require `this`
    'comma-dangle': ['error', 'always-multiline'],
    'dot-location': ['error', 'property'],
    'lines-around-comment': 'off', // conflicts with padded-blocks
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'max-len': ['error', { code: 120, ignoreUrls: true }],
    'new-cap': 'off', // used for RDF constants
    'no-param-reassign': 'off', // necessary in constructor overloading
    'no-underscore-dangle': 'off', // conflicts with external libraries
    'padding-line-between-statements': 'off',
    'prefer-named-capture-group': 'off',
    'tsdoc/syntax': 'error',
    'unicorn/catch-error-name': 'off',
    'unicorn/import-index': 'off',
    'unicorn/import-style': 'off',
    'unicorn/no-fn-reference-in-iterator': 'off', // this prevents some functional programming paradigms
    'unicorn/no-object-as-default-parameter': 'off',
    'unicorn/numeric-separators-style': 'off',
    'unicorn/prefer-ternary': 'off', // can get ugly with large single statements

    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: [ 'typeParameter' ],
        format: [ 'PascalCase' ],
        prefix: [ 'T' ],
      }
    ],

    // Import
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'sort-imports': 'off', // Disabled in favor of eslint-plugin-import
    'import/order': ['error', {
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      }
    }],
    'import/no-duplicates': 'error',
    'import/no-extraneous-dependencies': 'error',
    'no-duplicate-imports': 'off', // doesn't work with type imports
    'unused-imports/no-unused-imports-ts': 'error',
  },
};
