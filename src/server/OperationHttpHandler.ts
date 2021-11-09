import type { Operation } from '../http/Operation';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { AsyncHandler } from '../util/handlers/AsyncHandler';
import type { HttpHandlerInput } from './HttpHandler';

export interface OperationHttpHandlerInput extends HttpHandlerInput {
  operation: Operation;
}

/**
 * An HTTP handler that makes use of an already parsed Operation.
 */
export abstract class OperationHttpHandler
  extends AsyncHandler<OperationHttpHandlerInput, ResponseDescription> {}
