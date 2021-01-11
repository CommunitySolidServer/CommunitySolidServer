import { getLoggerFor } from '../../../logging/LogUtil';
import { BaseInteractionHttpHandler } from './BaseInteractionHttpHandler';

export class ContinueInteractionHttpHandler extends BaseInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public constructor() {
    super({
      allowedMethods: [ 'POST' ],
      pathnamePostfix: 'continue',
    });
  }

  public async handle(): Promise<void> {
    this.logger.info('Continue Interaction');
  }
}
