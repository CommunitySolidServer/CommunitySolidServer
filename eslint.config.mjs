import opinionated from 'opinionated-eslint-config';

export default opinionated().append({
  // Don't want to lint test assets
  ignores: [ 'test/assets/*', 'componentsjs-error-state.json' ],
});
