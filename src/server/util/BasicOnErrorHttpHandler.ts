import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { OnErrorHttpHandler } from '../../server/OnErrorHttpHandler';

/**
 * A basic OnErrorHttpHandler that simply prints the error.
 */
export class BasicOnErrorHttpHandler extends OnErrorHttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: { error: unknown; input: HttpHandlerInput }): Promise<void> {
    if (input.error instanceof Error) {
      input.input.response.end(`${input.error.stack}`);
    } else {
      input.input.response.end('Error');
    }
  }
}
