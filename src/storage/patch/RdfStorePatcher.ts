import type { Store } from 'n3';
import type { Patch } from '../../http/representation/Patch';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export interface RdfStorePatcherInput {
  /**
   * Identifier of the resource that will be patched
   */
  identifier: ResourceIdentifier;

  /**
   * The changes represented by a Patch object
   */
  patch: Patch;

  /**
   * The store on which the patch will be executed.
   * Note the RdfStorePatcher is allowed to make changes to the store.
   * This means the store object might be modified by the patch.
   */
  store: Store;
}

/**
 * Applies a Patch on an N3.js Store.
 */
export abstract class RdfStorePatcher extends AsyncHandler<RdfStorePatcherInput, Store> {}
