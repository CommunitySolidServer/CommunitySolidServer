module.exports = {
  rules: {
    'antfu/consistent-list-newline': 'error',

    'arrow-body-style': [ 'error', 'as-needed', { requireReturnForObjectLiteral: false }],
    'capitalized-comments': [ 'error', 'always', { ignoreConsecutiveComments: true }],
    'callback-return': 'error',
    'consistent-this': 'error',
    curly: [ 'error', 'all' ],
    'default-case': 'error',
    eqeqeq: [ 'error', 'always' ],
    'for-direction': 'error',
    'func-style': [ 'error', 'declaration' ],
    'function-call-argument-newline': [ 'error', 'consistent' ],
    'function-paren-newline': [ 'error', 'consistent' ],
    'getter-return': [ 'error', { allowImplicit: true }],
    'global-require': 'error',
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

    'node/prefer-global/buffer': [ 'error', 'always' ],
    'node/prefer-global/console': [ 'error', 'always' ],
    'node/prefer-global/process': [ 'error', 'always' ],
    'node/prefer-global/url': [ 'error', 'always' ],

    'style/array-bracket-spacing': [ 'error', 'always', {
      singleValue: true,
      objectsInArrays: false,
      arraysInArrays: false,
    }],
    // Conflicts with style/object-curly-spacing
    'style/block-spacing': 'off',
    'style/brace-style': [ 'error', '1tbs', { allowSingleLine: false }],
    'style/generator-star-spacing': [ 'error', { before: false, after: true }],
    // Seems to be inconsistent in when it adds indentation and when it does not
    'style/indent-binary-ops': 'off',
    'style/member-delimiter-style': [ 'error', {
      multiline: { delimiter: 'semi', requireLast: true },
      singleline: { delimiter: 'semi', requireLast: false },
    }],
    'style/no-extra-parens': [ 'error', 'all', {
      // To prevent conflicts with style/no-mixed-operators
      nestedBinaryExpressions: false,
    }],
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

    'unused-imports/no-unused-vars': [
      'error',
      { args: 'after-used', vars: 'all', ignoreRestSiblings: true },
    ],
  },
};
