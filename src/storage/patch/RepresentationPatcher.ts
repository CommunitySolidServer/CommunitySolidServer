import type { Patch } from '../../ldp/http/Patch';
import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export interface RepresentationPatcherInput {
  identifier: ResourceIdentifier;
  patch: Patch;
  representation?: Representation;
}

/**
 * Handles the patching of a specific Representation.
 */
export abstract class RepresentationPatcher extends AsyncHandler<RepresentationPatcherInput, Representation> {}
