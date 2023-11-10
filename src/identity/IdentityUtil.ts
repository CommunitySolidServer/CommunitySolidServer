import type { CanBePromise } from '../../templates/types/oidc-provider';

/**
 * Import the OIDC-provider package.
 *
 * As oidc-provider is an ESM package and CSS is CJS, we have to use a dynamic import here.
 * Unfortunately, there is a Node/Jest bug that causes segmentation faults when doing such an import in Jest:
 * https://github.com/nodejs/node/issues/35889
 * To work around that, we do the import differently, in case we are in a Jest test run.
 * This can be detected via the env variables: https://jestjs.io/docs/environment-variables.
 * There have been reports of `JEST_WORKER_ID` being undefined, so to be sure we check both.
 */
export function importOidcProvider(): CanBePromise<typeof import('../../templates/types/oidc-provider')> {
  if (process.env.JEST_WORKER_ID ?? process.env.NODE_ENV === 'test') {
    return jest.requireActual('oidc-provider');
  }
  return import('oidc-provider');
}
