import type { Adapter } from 'oidc-provider';

/**
 * A factory that generates an `Adapter` to be used by the IDP to persist information.
 *
 * The `oidc-provider` library will call the relevant functions when it needs to find/create/delete metadata.
 * For a full explanation of how these functions work and what is expected,
 * have a look at https://github.com/panva/node-oidc-provider/blob/main/example/my_adapter.js
 */
export interface AdapterFactory {
  createStorageAdapter: (name: string) => Adapter;
}
