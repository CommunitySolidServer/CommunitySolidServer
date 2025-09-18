'use strict';

/* eslint-disable-next-line import/extensions */
const options = require('../.markdownlint-cli2.cjs');

module.exports = {
  globs: [ '**/*.md' ],
  config: {
    // Re-use the base config
    ...options.config,

    // Disable line length due to requirements for issue templates
    MD013: false,

    // Allow first line to not be top level heading
    MD041: false,
  },
};
