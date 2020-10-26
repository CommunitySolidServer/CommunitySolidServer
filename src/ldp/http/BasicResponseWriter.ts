import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpResponse } from '../../server/HttpResponse';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { ResponseDescription } from '../operations/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming {@link ResponseDescription}.
 * Still needs a way to write correct status codes for successful operations.
 */
export class BasicResponseWriter extends ResponseWriter {
  protected readonly logger = getLoggerFor(this);

  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if ((input.result instanceof Error) || (input.result.body && !input.result.body.binary)) {
      this.logger.warn('This writer can only write binary bodies');
      throw new UnsupportedHttpError('Only binary results are supported');
    }
  }

  public async handle(input: { response: HttpResponse; result: ResponseDescription }): Promise<void> {
    input.response.setHeader('location', input.result.identifier.path);
    if (input.result.body) {
      const contentType = input.result.body.metadata.contentType ?? 'text/plain';
      input.response.setHeader('content-type', contentType);
    }

    input.response.writeHead(200);

    if (input.result.body) {
      input.result.body.data.pipe(input.response);
    } else {
      // If there is an input body the response will end once the input stream ends
      input.response.end();
    }
  }
}
