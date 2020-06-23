import { AsyncHandler } from '../../util/AsyncHandler';
import { Operation } from './Operation';
import { ResponseDescription } from './ResponseDescription';

/**
 * Handler for a specific operation type.
 */
export abstract class OperationHandler extends AsyncHandler<Operation, ResponseDescription> {}
