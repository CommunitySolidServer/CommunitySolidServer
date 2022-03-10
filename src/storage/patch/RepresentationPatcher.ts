import type { Patch } from '../../http/representation/Patch';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export interface RepresentationPatcherInput {
  identifier: ResourceIdentifier;
  patch: Patch;
  representation?: Representation;
  metadata?: boolean;
}

/**
 * Handles the patching of a specific Representation.
 */
export abstract class RepresentationPatcher extends AsyncHandler<RepresentationPatcherInput, Representation> {}
