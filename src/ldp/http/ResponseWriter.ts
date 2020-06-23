import { AsyncHandler } from '../../util/AsyncHandler';
import { HttpResponse } from '../../server/HttpResponse';
import { ResponseDescription } from '../operations/ResponseDescription';

/**
 * Writes to the HttpResponse.
 * Response depends on the operation result and potentially which errors was thrown.
 */
export abstract class ResponseWriter extends AsyncHandler<{ response: HttpResponse; description?: ResponseDescription; error?: Error }> {}
