import { AsyncHandler } from 'asynchronous-handlers';
import type { Shorthand } from '../Types';

/**
 * A handler that computes a specific value from a given map of values.
 */
export abstract class ShorthandExtractor extends AsyncHandler<Shorthand, unknown> {}
