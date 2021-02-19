import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { OnErrorHttpHandler } from '../../server/OnErrorHttpHandler';
import { HttpError } from '../../util/errors/HttpError';

/**
 * A basic OnErrorHttpHandler that simply prints the error.
 */
export class BasicOnErrorHttpHandler extends OnErrorHttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: { error: unknown; input: HttpHandlerInput }): Promise<void> {
    if (input.error instanceof Error) {
      if (input.error instanceof HttpError) {
        input.input.response.statusCode = input.error.statusCode;
      } else {
        input.input.response.statusCode = 500;
      }
      input.input.response.end(`${input.error.stack}`);
    } else {
      input.input.response.statusCode = 500;
      input.input.response.end('Error');
    }
  }
}
