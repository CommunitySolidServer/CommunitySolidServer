import { AsyncHandler } from '../../util/AsyncHandler';
import { Operation } from './Operation';

/**
 * Handler for a specific operation type.
 */
export type OperationHandler = AsyncHandler<Operation>;
