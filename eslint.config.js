const antfu = require('@antfu/eslint-config').default;
const jest = require('eslint-plugin-jest');

// Copied from https://github.com/antfu/eslint-config/blob/main/src/configs/typescript.ts
// Doing it like this, so we can make sure these only try to trigger on *.ts files,
// preventing issues with the *.js files.
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

module.exports = antfu(
  {},
  {
    // Don't want to lint test assets, or TS snippets in markdown files
    ignores: [ 'test/assets/*', '**/*.md/**/*.ts' ],
  },
  {
    rules: {
      'max-len': 'off',
      'unicorn/filename-case': [ 'error', {
        cases: {
          camelCase: false,
          pascalCase: false,
          kebabCase: true,
          snakeCase: false,
        },
      }],
    },
  },
  {
    // By default, antfu also triggers type rules on *.js files which causes all kinds of issues for us
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.json', './scripts/tsconfig.json', './test/tsconfig.json' ],
      },
    },
    rules: {
      ...typeAwareRules,
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
      'ts/no-floating-promises': [ 'error', { ignoreVoid: false }],
      'ts/promise-function-async': 'error',

      // These are not type specific, but we only care for TS files
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
  },
  {
    rules: {
      // Might want to enable this one but has a drastic impact on the already existing code
      'antfu/consistent-list-newline': 'off',

      curly: [ 'error', 'all' ],
      'function-paren-newline': [ 'error', 'consistent' ],
      'jsdoc/no-multi-asterisks': [ 'error', { allowWhitespace: true }],
      // Need to override `allow` value
      'no-console': [ 'error', { allow: [ '' ]}],
      'no-constructor-return': 'error',
      'no-sync': [ 'error', { allowAtRootLevel: false }],
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
      'require-unicode-regexp': 'error',
      'sort-imports': [
        'error',
        {
          allowSeparatedGroups: false,
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: [ 'none', 'all', 'multiple', 'single' ],
        },
      ],

      'style/array-bracket-spacing': [ 'error', 'always', {
        singleValue: true,
        objectsInArrays: false,
        arraysInArrays: false,
      }],
      // Conflicts with style/object-curly-spacing
      'style/block-spacing': 'off',
      'style/brace-style': [ 'error', '1tbs', { allowSingleLine: false }],
      'style/member-delimiter-style': [ 'error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false },
      }],
      'style/no-extra-parens': [ 'error', 'all', {
        conditionalAssign: false,
        enforceForArrowConditionals: false,
        ignoreJSX: 'all',
        nestedBinaryExpressions: false,
        returnAssign: false,
      }],
      'style/object-curly-spacing': [ 'error', 'always', {
        objectsInObjects: false,
        arraysInObjects: false,
      }],
      'style/operator-linebreak': [ 'error', 'after' ],
      'style/semi': [ 'error', 'always' ],
      'style/space-before-function-paren': [ 'error', 'never' ],
      'style/quote-props': [ 'error', 'as-needed', {
        keywords: false,
        unnecessary: true,
        numbers: false,
      }],
      'style/yield-star-spacing': [ 'error', 'after' ],

      'test/prefer-lowercase-title': 'off',
      'ts/consistent-indexed-object-style': [ 'error', 'record' ],
      'ts/consistent-type-definitions': 'off',
      'ts/method-signature-style': 'error',
      'ts/no-extraneous-class': [ 'error', {
        allowConstructorOnly: false,
        allowEmpty: false,
        allowStaticOnly: false,
      }],

      'unicorn/consistent-function-scoping': 'error',
      'unicorn/expiring-todo-comments': [ 'error', {
        ignoreDatesOnPullRequests: false,
        terms: [ 'todo' ],
        allowWarningComments: false,
      }],
      'unicorn/no-process-exit': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prefer-spread': 'error',
      'unicorn/require-array-join-separator': 'error',

      'unused-imports/no-unused-vars': [
        'error',
        { args: 'after-used', vars: 'all', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Specifically for tests
    // See https://github.com/jest-community/eslint-plugin-jest/issues/1408
    plugins: {
      jest,
    },
    files: [ 'test/**/*.ts' ],
    rules: {
      ...jest.configs.all.rules,
      // Rule is not smart enough to check called function in the test
      'jest/expect-expect': 'off',
      'jest/valid-title': [ 'error', {
        mustNotMatch: {
          describe: /\.$/u.source,
        },
        mustMatch: {
          it: /\.$/u.source,
        },
      }],

      // Default rules that are overkill
      'jest/no-hooks': 'off',
      'jest/max-expects': 'off',
      'jest/no-conditional-in-test': 'off',
      'jest/prefer-expect-assertions': 'off',
      'jest/prefer-lowercase-title': 'off',
      'jest/prefer-strict-equal': 'off',
      'jest/require-hook': 'off',

      'ts/naming-convention': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-call': 'off',
      'ts/no-unsafe-member-access': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/unbound-method': 'off',

      // Incorrectly detects usage of undefined in "toHaveBeenLastCalledWith" checks
      'unicorn/no-useless-undefined': 'off',
    },
  },
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
