import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdPInteractionHttpHandlerInput } from '../../IdPInteractionHttpHandler';
import { IdPInteractionHttpHandler } from '../../IdPInteractionHttpHandler';

export class EmailPasswordLoginHandler extends IdPInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    this.logger.verbose('Register Handler');
    input.response.end('Register Handler');
  }
}
