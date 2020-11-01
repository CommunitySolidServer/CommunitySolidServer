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

    // Need these 2 to run tests for throwing non-Error objects
    '@typescript-eslint/no-throw-literal': 'off',
    'no-throw-literal': 'off',
  },
};
