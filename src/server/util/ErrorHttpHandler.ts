import { getLoggerFor } from '../../logging/LogUtil';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { OnErrorHttpHandler } from '../../server/HttpHandler';

export class ErrorHttpHandler extends OnErrorHttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: { error: unknown; input: HttpHandlerInput }): Promise<void> {
    this.logger.verbose('Error');
    input.input.response.end('Error');
  }
}
