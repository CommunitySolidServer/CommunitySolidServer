module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.json'],
  },
  plugins: [
    'prettier',
    'eslint-plugin-tsdoc',
  ],
  extends: [
    'es/node',
    'prettier', // disables rules from the above that conflict with prettier
    'plugin:prettier/recommended', // adds prettier rules
  ],
  rules: {
    '@typescript-eslint/no-empty-interface': 'off',
    "sort-imports": "error",
    'tsdoc/syntax': 'error',
  },
};
