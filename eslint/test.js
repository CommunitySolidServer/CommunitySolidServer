const jest = require('eslint-plugin-jest');

// Specifically for tests
module.exports = {
  name: 'opinionated:test',
  // See https://github.com/jest-community/eslint-plugin-jest/issues/1408
  plugins: {
    jest,
  },
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
    'jest/prefer-importing-jest-globals': 'off',
    'jest/prefer-lowercase-title': 'off',
    'jest/prefer-strict-equal': 'off',
    'jest/require-hook': 'off',

    'test/prefer-lowercase-title': 'off',

    'ts/naming-convention': 'off',
    'ts/no-explicit-any': 'off',
    'ts/no-unsafe-argument': 'off',
    'ts/no-unsafe-assignment': 'off',
    'ts/no-unsafe-call': 'off',
    'ts/no-unsafe-member-access': 'off',
    'ts/no-unsafe-return': 'off',
    'ts/unbound-method': 'off',

    // Incorrectly detects usage of undefined in "toHaveBeenLastCalledWith" checks
    'unicorn/no-useless-undefined': 'off',
  },
};
