import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { Representation } from '../representation/Representation';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';

export type ValidatorInput = {
  representation: Representation;
  identifier: ResourceIdentifier;
};

/**
 * Generic interface for classes that validate Representations in some way.
 */
export abstract class Validator extends AsyncHandler<ValidatorInput, Representation> {}
