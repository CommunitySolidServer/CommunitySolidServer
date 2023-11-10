module.exports = {
  extends: [ '@commitlint/config-conventional' ],
  rules: {
    'subject-case': [
      2,
      'never',
      [ 'start-case', 'kebab-case', 'snake-case' ],
    ],
  },
};
