const antfu = require('@antfu/eslint-config').default;
const jest = require('eslint-plugin-jest');

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

const configs = antfu(
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

      'arrow-body-style': [ 'error', 'as-needed', { requireReturnForObjectLiteral: false }],
      'capitalized-comments': [ 'error', 'always', { ignoreConsecutiveComments: true }],
      curly: [ 'error', 'all' ],
      'default-case': 'error',
      eqeqeq: [ 'error', 'always' ],
      'for-direction': 'error',
      'func-style': [ 'error', 'declaration' ],
      'function-call-argument-newline': [ 'error', 'consistent' ],
      'function-paren-newline': [ 'error', 'consistent' ],
      'getter-return': [ 'error', { allowImplicit: true }],
      'grouped-accessor-pairs': [ 'error', 'getBeforeSet' ],
      'guard-for-in': 'error',
      'line-comment-position': [ 'error', { position: 'above' }],
      'linebreak-style': [ 'error', 'unix' ],
      'multiline-comment-style': [ 'error', 'separate-lines' ],
      // Need to override `allow` value
      'no-console': [ 'error', { allow: [ '' ]}],
      'no-constructor-return': 'error',
      'no-dupe-else-if': 'error',
      'no-else-return': [ 'error', { allowElseIf: false }],
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-lonely-if': 'error',
      'no-plusplus': [ 'error', { allowForLoopAfterthoughts: true }],
      'no-sync': [ 'error', { allowAtRootLevel: false }],
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'operator-assignment': [ 'error', 'always' ],
      'prefer-object-spread': 'error',
      radix: 'error',
      'require-unicode-regexp': 'error',
      'require-yield': 'error',
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

      'import/extensions': 'error',

      'jsdoc/no-multi-asterisks': [ 'error', { allowWhitespace: true }],

      // Might want to enable these
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',

      'style/array-bracket-spacing': [ 'error', 'always', {
        singleValue: true,
        objectsInArrays: false,
        arraysInArrays: false,
      }],
      // Conflicts with style/object-curly-spacing
      'style/block-spacing': 'off',
      'style/brace-style': [ 'error', '1tbs', { allowSingleLine: false }],
      'style/generator-star-spacing': [ 'error', { before: false, after: true }],
      'style/member-delimiter-style': [ 'error', {
        multiline: { delimiter: 'semi', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false },
      }],
      'style/no-extra-parens': [ 'error', 'functions' ],
      'style/object-curly-spacing': [ 'error', 'always', {
        objectsInObjects: false,
        arraysInObjects: false,
      }],
      'style/operator-linebreak': [ 'error', 'after' ],
      'style/semi': [ 'error', 'always' ],
      'style/semi-style': [ 'error', 'last' ],
      'style/space-before-function-paren': [ 'error', 'never' ],
      'style/switch-colon-spacing': 'error',
      'style/quote-props': [ 'error', 'as-needed', {
        keywords: false,
        unnecessary: true,
        numbers: false,
      }],
      'style/yield-star-spacing': [ 'error', 'after' ],

      'ts/adjacent-overload-signatures': 'error',
      'ts/array-type': 'error',
      'ts/ban-ts-comment': [ 'error', {
        'ts-expect-error': true,
      }],
      'ts/consistent-indexed-object-style': [ 'error', 'record' ],
      'ts/consistent-type-definitions': 'off',
      'ts/explicit-member-accessibility': 'error',
      'ts/method-signature-style': 'error',
      'ts/no-confusing-non-null-assertion': 'error',
      'ts/no-extraneous-class': [ 'error', {
        allowConstructorOnly: false,
        allowEmpty: false,
        allowStaticOnly: false,
      }],
      'ts/no-inferrable-types': [ 'error', {
        ignoreParameters: false,
        ignoreProperties: false,
      }],
      'ts/prefer-for-of': 'error',
      'ts/prefer-function-type': 'error',

      'unicorn/better-regex': 'error',
      'unicorn/empty-brace-spaces': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/expiring-todo-comments': [ 'error', {
        ignoreDatesOnPullRequests: false,
        terms: [ 'todo' ],
        allowWarningComments: false,
      }],
      'unicorn/explicit-length-check': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-for-loop': 'error',
      'unicorn/no-invalid-remove-event-listener': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-process-exit': 'error',
      'unicorn/no-thenable': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/no-zero-fractions': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-code-point': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-native-coercion-functions': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-reflect-apply': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-set-size': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/require-array-join-separator': 'error',
      'unicorn/require-number-to-fixed-digits-argument': 'error',

      // Might want to enable these
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/no-object-as-default-parameter': 'off',
      'unicorn/prefer-node-protocol': 'off',

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

      'test/prefer-lowercase-title': 'off',

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

// The default ignore list contains all `output` folders, which conflicts with our src/http/output folder
// See https://github.com/antfu/eslint-config/blob/29f29f1e16d0187f5c870102f910d798acd9b874/src/globs.ts#L53
if (!configs[1].ignores.includes('**/output')) {
  throw new Error('Unexpected data in config position. Check if antfu changed how it handles ignores.');
}
delete configs[1].ignores;

module.exports = configs;
