import { AsyncHandler } from '../util/AsyncHandler';
import { HttpRequest } from './HttpRequest';
import { HttpResponse } from './HttpResponse';

/**
 * An HTTP request handler.
 */
export abstract class HttpHandler extends AsyncHandler<{ request: HttpRequest; response: HttpResponse }> {}
