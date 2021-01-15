import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';

export class RegisterHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: HttpHandlerInput): Promise<void> {
    this.logger.verbose('Register Handler');
    input.response.end('Register Handler');
  }
}
