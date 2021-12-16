import { AsyncHandler } from '../../../util/handlers/AsyncHandler';

/**
 * A handler that computes a specific value from a given map of values.
 */
export abstract class ValueComputer extends AsyncHandler<Record<string, unknown>, unknown> {}
