module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.json'],
  },
  plugins: [
    'eslint-plugin-tsdoc',
  ],
  extends: [
    'es/node',
  ],
  rules: {
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/space-before-function-paren': [ 'error', 'never' ],
    'class-methods-use-this': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'padding-line-between-statements': 'off',
    'tsdoc/syntax': 'error',
  },
};
