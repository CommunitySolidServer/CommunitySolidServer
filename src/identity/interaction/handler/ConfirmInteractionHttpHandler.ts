import { getLoggerFor } from '../../../logging/LogUtil';
import { BaseInteractionHttpHandler } from './BaseInteractionHttpHandler';

export class ConfirmInteractionHttpHandler extends BaseInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public constructor() {
    super({
      allowedMethods: [ 'POST' ],
      pathnamePostfix: 'confirm',
    });
  }

  public async handle(): Promise<void> {
    this.logger.info('Confirmation Interaction');
  }
}
