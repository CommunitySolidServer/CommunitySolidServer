import { getLoggerFor } from '../../../logging/LogUtil';
import { HttpHandler } from '../../../server/HttpHandler';

export class ConfirmInteractionHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(): Promise<void> {
    this.logger.info('Confirmation Interaction');
  }
}
