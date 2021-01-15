import { AsyncHandler } from '../util/AsyncHandler';
import { OnErrorHandler } from '../util/ErrorHandlingWaterfallHandler';
import type { HttpRequest } from './HttpRequest';
import type { HttpResponse } from './HttpResponse';

export interface HttpHandlerInput {
  request: HttpRequest;
  response: HttpResponse;
}

/**
 * An HTTP request handler.
 */
export abstract class HttpHandler extends AsyncHandler<HttpHandlerInput> {}

export abstract class OnErrorHttpHandler extends OnErrorHandler<HttpHandlerInput, void> {}
