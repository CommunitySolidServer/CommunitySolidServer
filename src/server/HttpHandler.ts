import { AsyncHandler } from '../util/AsyncHandler';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';

/**
 * An HTTP request handler.
 */
export abstract class HttpHandler extends AsyncHandler<{ request: HttpRequest; response: HttpResponse }> {}
