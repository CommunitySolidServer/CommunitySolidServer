import { AsyncHandler } from 'asynchronous-handlers';
import type { Patch } from '../../http/representation/Patch';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { ChangeMap, ResourceStore } from '../ResourceStore';

export type PatchHandlerInput<T extends ResourceStore = ResourceStore> = {
  source: T;
  identifier: ResourceIdentifier;
  patch: Patch;
};

/**
 * Executes the given Patch.
 */
export abstract class PatchHandler<T extends ResourceStore = ResourceStore>
  extends AsyncHandler<PatchHandlerInput<T>, ChangeMap> {}
