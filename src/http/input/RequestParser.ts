import { AsyncHandler } from 'asynchronous-handlers';
import type { HttpRequest } from '../../server/HttpRequest';
import type { Operation } from '../Operation';

/**
 * Converts an incoming HttpRequest to an Operation.
 */
export abstract class RequestParser extends AsyncHandler<HttpRequest, Operation> {}
