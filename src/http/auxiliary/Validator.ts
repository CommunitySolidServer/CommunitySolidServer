import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { Representation } from '../representation/Representation';

/**
 * Generic interface for classes that validate Representations in some way.
 */
export abstract class Validator extends AsyncHandler<Representation> { }
