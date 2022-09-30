import { getLoggerFor } from '../../logging/LogUtil';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import type { NotificationHandler } from './NotificationHandler';
import { StateHandler } from './StateHandler';
import type { SubscriptionInfo, SubscriptionStorage } from './SubscriptionStorage';

/**
 * Handles the `state` feature by calling a {@link NotificationHandler}
 * in case the {@link SubscriptionInfo} has a `state` value.
 *
 * Deletes the `state` parameter from the info afterwards.
 */
export class BaseStateHandler extends StateHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: NotificationHandler;
  private readonly storage: SubscriptionStorage;

  public constructor(handler: NotificationHandler, storage: SubscriptionStorage) {
    super();
    this.handler = handler;
    this.storage = storage;
  }

  public async handle({ info }: { info: SubscriptionInfo }): Promise<void> {
    if (info.state) {
      const topic = { path: info.topic };
      try {
        await this.handler.handleSafe({ info, topic });
        // Remove the state once the relevant notification has been sent
        delete info.state;
        await this.storage.update(info);
      } catch (error: unknown) {
        this.logger.error(`Problem emitting state notification: ${createErrorMessage(error)}`);
      }
    }
  }
}
