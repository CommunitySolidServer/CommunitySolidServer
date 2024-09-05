import { AsyncHandler } from 'asynchronous-handlers';
import type { HttpResponse } from '../../server/HttpResponse';
import type { ResponseDescription } from './response/ResponseDescription';

/**
 * Writes the ResponseDescription to the HttpResponse.
 */
export abstract class ResponseWriter
  extends AsyncHandler<{ response: HttpResponse; result: ResponseDescription }> {}
