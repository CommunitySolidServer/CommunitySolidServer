import { AsyncHandler } from '../../util/AsyncHandler';
import type { ResponseDescription } from '../http/response/ResponseDescription';
import type { Operation } from './Operation';

/**
 * Handler for a specific operation type.
 */
export abstract class OperationHandler extends AsyncHandler<Operation, ResponseDescription> {}
