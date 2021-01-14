import { getLoggerFor } from '../../../../logging/LogUtil';
import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { HttpHandler } from '../../../../server/HttpHandler';

export class InitialInteractionChooserHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(input: HttpHandlerInput): Promise<void> {
    this.logger.verbose('Initial Chooser');
    input.response.end('Initial Chooser');
  }
}
