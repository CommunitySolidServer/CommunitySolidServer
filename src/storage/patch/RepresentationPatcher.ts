import { AsyncHandler } from 'asynchronous-handlers';
import type { Patch } from '../../http/representation/Patch';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';

export interface RepresentationPatcherInput<T> {
  identifier: ResourceIdentifier;
  patch: Patch;
  representation?: T;
}

/**
 * Handles the patching of a specific Representation.
 */
export abstract class RepresentationPatcher<T> extends AsyncHandler<RepresentationPatcherInput<T>, T> {}
