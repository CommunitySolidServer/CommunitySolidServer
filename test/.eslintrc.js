module.exports = {
  plugins: [
    'jest',
  ],
  extends: [
    'plugin:jest/recommended',
    'plugin:jest/style',
  ],
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'off',
    'unicorn/no-useless-undefined': 'off',
    'no-process-env': 'off',

    // Rule is not smart enough to check called function in the test
    'jest/expect-expect': 'off',

    // We are not using Mocha
    'mocha/no-exports': 'off',
    'mocha/no-nested-tests': 'off',
    'mocha/no-skipped-tests': 'off',
    'mocha/no-synchronous-tests': 'off',
    'mocha/no-top-level-hooks': 'off',

    // Need these 2 to run tests for throwing non-Error objects
    '@typescript-eslint/no-throw-literal': 'off',
    'no-throw-literal': 'off',
  },
};
