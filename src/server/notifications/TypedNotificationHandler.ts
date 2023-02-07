import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { NotificationHandlerInput } from './NotificationHandler';
import { NotificationHandler } from './NotificationHandler';

/**
 * A {@link NotificationHandler} that only accepts input for a specific notification channel type.
 */
export class TypedNotificationHandler extends NotificationHandler {
  private readonly type: string;
  private readonly source: NotificationHandler;

  public constructor(type: string, source: NotificationHandler) {
    super();
    this.type = type;
    this.source = source;
  }

  public async canHandle(input: NotificationHandlerInput): Promise<void> {
    if (input.channel.type !== this.type) {
      throw new NotImplementedHttpError(`Only ${this.type} notification channels are supported.`);
    }
    await this.source.canHandle(input);
  }

  public async handle(input: NotificationHandlerInput): Promise<void> {
    await this.source.handle(input);
  }
}
