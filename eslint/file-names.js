module.exports = [
  {
    name: 'opinionated:file-names:all',
    rules: {
      'unicorn/filename-case': [ 'error', {
        cases: {
          camelCase: false,
          pascalCase: false,
          kebabCase: true,
          snakeCase: false,
        },
        ignore: [
          // CODE_OF_CONDUCT.md, etc.
          /[A-Z_]+\.md$/u,
        ],
      }],
    },
  },
  {
    name: 'opinionated:file-names:ts',
    files: [ '**/*.ts' ],
    rules: {
      'unicorn/filename-case': [ 'error', {
        cases: {
          camelCase: true,
          pascalCase: true,
          kebabCase: false,
          snakeCase: false,
        },
      }],
    },
  },
];
