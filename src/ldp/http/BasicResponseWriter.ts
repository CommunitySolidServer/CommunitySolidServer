import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpResponse } from '../../server/HttpResponse';
import { HttpError } from '../../util/errors/HttpError';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { ResponseDescription } from '../operations/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming {@link ResponseDescription} or error.
 * Still needs a way to write correct status codes for successful operations.
 */
export class BasicResponseWriter extends ResponseWriter {
  protected readonly logger = getLoggerFor(this);

  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (!(input.result instanceof Error) && input.result.body && !input.result.body.binary) {
      this.logger.warn('This writer can only write binary bodies and errors');
      throw new UnsupportedHttpError('Only binary results and errors are supported');
    }
  }

  public async handle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (input.result instanceof Error) {
      let code = 500;
      if (input.result instanceof HttpError) {
        code = input.result.statusCode;
      }
      input.response.setHeader('content-type', 'text/plain');
      input.response.writeHead(code);
      input.response.end(typeof input.result.stack === 'string' ?
        `${input.result.stack}\n` :
        `${input.result.name}: ${input.result.message}\n`);
    } else {
      input.response.setHeader('location', input.result.identifier.path);
      if (input.result.body) {
        const contentType = input.result.body.metadata.contentType ?? 'text/plain';
        input.response.setHeader('content-type', contentType);
        input.result.body.data.pipe(input.response);
      }

      input.response.writeHead(200);

      if (!input.result.body) {
        // If there is an input body the response will end once the input stream ends
        input.response.end();
      }
    }
  }
}
