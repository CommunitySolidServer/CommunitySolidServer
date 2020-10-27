import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpResponse } from '../../server/HttpResponse';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { HTTP } from '../../util/UriConstants';
import type { ResponseDescription } from './response/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming {@link ResponseDescription}.
 */
export class BasicResponseWriter extends ResponseWriter {
  protected readonly logger = getLoggerFor(this);

  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (input.result instanceof Error || input.result.metadata?.contentType === INTERNAL_QUADS) {
      this.logger.warn('This writer only supports binary ResponseDescriptions');
      throw new UnsupportedHttpError('Only successful binary responses are supported');
    }
  }

  public async handle(input: { response: HttpResponse; result: ResponseDescription }): Promise<void> {
    const location = input.result.metadata?.get(HTTP.location);
    if (location) {
      input.response.setHeader('location', location.value);
    }
    if (input.result.data) {
      const contentType = input.result.metadata?.contentType ?? 'text/plain';
      input.response.setHeader('content-type', contentType);
    }

    input.response.writeHead(input.result.statusCode);

    if (input.result.data) {
      input.result.data.pipe(input.response);
    } else {
      // If there is input data the response will end once the input stream ends
      input.response.end();
    }
  }
}
