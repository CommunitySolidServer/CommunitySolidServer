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

    // We are not using Mocha
    'mocha/no-exports': 'off',
    'mocha/no-skipped-tests': 'off',
    'mocha/no-synchronous-tests': 'off',

    // Need these 2 to run tests for throwing non-Error objects
    '@typescript-eslint/no-throw-literal': 'off',
    'no-throw-literal': 'off',
  },
};
