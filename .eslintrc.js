module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.json'],
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier', // disables rules from the above that conflict with prettier
    'plugin:prettier/recommended', // adds prettier rules
  ],
  rules: {
    '@typescript-eslint/no-empty-interface': 'off',
    'prettier/prettier': 'error',
  },
};
