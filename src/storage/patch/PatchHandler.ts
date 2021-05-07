import type { Patch } from '../../ldp/http/Patch';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { ResourceStore } from '../ResourceStore';

export type PatchHandlerArgs<T extends ResourceStore = ResourceStore> = {
  source: T;
  identifier: ResourceIdentifier;
  patch: Patch;
};

/**
 * Executes the given Patch.
 */
export abstract class PatchHandler<T extends ResourceStore = ResourceStore>
  extends AsyncHandler<PatchHandlerArgs<T>, ResourceIdentifier[]> {}
