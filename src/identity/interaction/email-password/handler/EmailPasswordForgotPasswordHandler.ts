import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { IdPInteractionHttpHandler } from '../../IdPInteractionHttpHandler';

export class EmailPasswordForgotPasswordHandler extends IdPInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: HttpHandlerInput): Promise<void> {
    this.logger.verbose('Forgot Password');
    input.response.end('Forgot Passwrod');
  }
}
