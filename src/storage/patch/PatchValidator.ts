import type { Store } from 'n3';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Validates whether certain patches are allowed on the resource
 */
export abstract class PatchValidator extends AsyncHandler<PatchValidatorArgs, boolean> {}

export interface PatchValidatorArgs {
  /**
   * Identifier of the resource that will be patched
   */
  identifier: ResourceIdentifier;

  /**
   * The store before a patch is executed
   */
  inputStore: Store;
  /**
   * The store after a patch is executed
   */
  patchedStore: Store;
}
