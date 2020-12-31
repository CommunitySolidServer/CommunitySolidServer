import { getLoggerFor } from '../../../../logging/LogUtil';
import { BaseInteractionHttpHandler } from './BaseInteractionHttpHandler';

export class LoginInteractionHttpHandler extends BaseInteractionHttpHandler {
  private readonly logger = getLoggerFor(this);

  public constructor() {
    super({
      allowedMethods: [ 'POST' ],
      pathnamePostfix: 'login',
    });
  }

  public async handle(): Promise<void> {
    this.logger.info('Login Interaction');
  }
}
