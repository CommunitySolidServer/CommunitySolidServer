import type { Store } from 'n3';
import type { Patch } from '../../http/representation/Patch';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export interface RdfStorePatcherInput {
  identifier: ResourceIdentifier;
  patch: Patch;
  store: Store;
}

/**
 * Handles the patching on a N3 Store
 */
export abstract class RdfStorePatcher extends AsyncHandler<RdfStorePatcherInput, Store> {

}
