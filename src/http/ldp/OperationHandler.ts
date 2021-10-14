import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { Operation } from '../Operation';
import type { ResponseDescription } from '../output/response/ResponseDescription';

export interface OperationHandlerInput {
  operation: Operation;
}

/**
 * Handler for a specific operation type.
 */
export abstract class OperationHandler extends AsyncHandler<OperationHandlerInput, ResponseDescription> {}
