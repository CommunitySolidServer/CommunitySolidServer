import { AsyncHandler } from '../../util/AsyncHandler';
import type { Operation } from './Operation';
import type { ResponseDescription } from './ResponseDescription';

/**
 * Handler for a specific operation type.
 */
export abstract class OperationHandler extends AsyncHandler<Operation, ResponseDescription> {}
