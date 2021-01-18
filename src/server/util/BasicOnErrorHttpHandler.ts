import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { OnErrorHttpHandler } from '../../server/HttpHandler';

export class BasicOnErrorHttpHandler extends OnErrorHttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: { error: unknown; input: HttpHandlerInput }): Promise<void> {
    if (input.error instanceof Error) {
      this.logger.error(input.error.message);
    }
    this.logger.verbose('Error');
    input.input.response.end('Error');
  }
}
