import { getLoggerFor } from '../../../../logging/LogUtil';
import { BaseInteractionHttpHandler } from './BaseInteractionHttpHandler';

export class AbortInteractionHttpHandler extends BaseInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public constructor() {
    super({
      allowedMethods: [ 'POST' ],
      pathnamePostfix: 'abort',
    });
  }
  // }

  public async handle(): Promise<void> {
    this.logger.info('Abort Interaction');
  }
}
