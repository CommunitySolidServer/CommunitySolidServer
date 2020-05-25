import { AsyncHandler } from '../util/AsyncHandler';
import { HttpRequest } from './HttpRequest';
import { HttpResponse } from './HttpResponse';

/**
 * An HTTP request handler.
 */
export type HttpHandler = AsyncHandler<{ request: HttpRequest; response: HttpResponse }>;
