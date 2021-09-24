import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';

export interface OperationHandlerInput {
  operation: Operation;
}

/**
 * Handler for a specific operation type.
 */
export abstract class OperationHandler extends AsyncHandler<OperationHandlerInput, ResponseDescription> {}
