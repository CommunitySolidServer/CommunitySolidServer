import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpResponse } from '../../server/HttpResponse';
import { HttpError } from '../../util/errors/HttpError';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { ResponseDescription } from '../operations/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming Error.
 */
export class ErrorResponseWriter extends ResponseWriter {
  protected readonly logger = getLoggerFor(this);

  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (!(input.result instanceof Error)) {
      this.logger.warn('This writer can only write errors');
      throw new UnsupportedHttpError('Only errors are supported');
    }
  }

  public async handle(input: { response: HttpResponse; result: Error }): Promise<void> {
    let code = 500;
    if (input.result instanceof HttpError) {
      code = input.result.statusCode;
    }
    input.response.setHeader('content-type', 'text/plain');
    input.response.writeHead(code);
    input.response.end(typeof input.result.stack === 'string' ?
      `${input.result.stack}\n` :
      `${input.result.name}: ${input.result.message}\n`);
  }
}
