import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';

export class ResetPasswordHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: HttpHandlerInput): Promise<void> {
    this.logger.verbose('Reset Password Handler');
    input.response.end('Reset Password Handler');
  }
}
