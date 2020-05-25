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
    "sort-imports": "error",
    'tsdoc/syntax': 'error',
  },
};
