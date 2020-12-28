import { getLoggerFor } from '../../../logging/LogUtil';
import { HttpHandler } from '../../../server/HttpHandler';

export class AbortInteractionHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  public async handle(): Promise<void> {
    this.logger.info('Abort Interaction');
  }
}
