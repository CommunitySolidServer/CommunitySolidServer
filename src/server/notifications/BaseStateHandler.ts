import { getLoggerFor } from '../../logging/LogUtil';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { NotificationChannel } from './NotificationChannel';
import type { NotificationChannelStorage } from './NotificationChannelStorage';
import type { NotificationHandler } from './NotificationHandler';
import { StateHandler } from './StateHandler';

/**
 * Handles the `state` feature by calling a {@link NotificationHandler}
 * in case the {@link NotificationChannel} has a `state` value.
 *
 * Deletes the `state` parameter from the channel afterwards.
 */
export class BaseStateHandler extends StateHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: NotificationHandler;
  private readonly storage: NotificationChannelStorage;

  public constructor(handler: NotificationHandler, storage: NotificationChannelStorage) {
    super();
    this.handler = handler;
    this.storage = storage;
  }

  public async handle({ channel }: { channel: NotificationChannel }): Promise<void> {
    if (channel.state) {
      const topic = { path: channel.topic };
      try {
        await this.handler.handleSafe({ channel, topic });
        // Remove the state once the relevant notification has been sent
        delete channel.state;
        await this.storage.update(channel);
      } catch (error: unknown) {
        this.logger.error(`Problem emitting state notification: ${createErrorMessage(error)}`);
      }
    }
  }
}
