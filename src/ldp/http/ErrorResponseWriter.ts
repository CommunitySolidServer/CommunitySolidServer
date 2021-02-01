import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpResponse } from '../../server/HttpResponse';
import { isNativeError } from '../../util/errors/ErrorUtil';
import { HttpError } from '../../util/errors/HttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ResponseDescription } from './response/ResponseDescription';
import { ResponseWriter } from './ResponseWriter';

/**
 * Writes to an {@link HttpResponse} based on the incoming Error.
 */
export class ErrorResponseWriter extends ResponseWriter {
  protected readonly logger = getLoggerFor(this);

  public async canHandle(input: { response: HttpResponse; result: ResponseDescription | Error }): Promise<void> {
    if (!isNativeError(input.result)) {
      throw new NotImplementedHttpError('Only errors are supported');
    }
  }

  public async handle(input: { response: HttpResponse; result: Error }): Promise<void> {
    let code = 500;
    if (HttpError.isInstance(input.result)) {
      code = input.result.statusCode;
    }
    input.response.setHeader('content-type', 'text/plain');
    input.response.writeHead(code);
    input.response.end(typeof input.result.stack === 'string' ?
      `${input.result.stack}\n` :
      `${input.result.name}: ${input.result.message}\n`);
  }
}
