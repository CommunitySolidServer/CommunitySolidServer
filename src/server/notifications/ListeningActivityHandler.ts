import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { createErrorMessage } from '../../util/errors/ErrorUtil';
import { StaticHandler } from '../../util/handlers/StaticHandler';
import type { AS, VocabularyTerm } from '../../util/Vocabularies';
import type { ActivityEmitter } from './ActivityEmitter';
import type { NotificationChannelStorage } from './NotificationChannelStorage';
import type { NotificationHandler } from './NotificationHandler';

/**
 * Listens to an {@link ActivityEmitter} and calls the stored {@link NotificationHandler}s in case of an event
 * for every matching notification channel found.
 *
 * Takes the `rate` feature into account so only channels that want a new notification will receive one.
 *
 * Extends {@link StaticHandler} so it can be more easily injected into a Components.js configuration.
 * No class takes this one as input, so to make sure Components.js instantiates it,
 * it needs to be added somewhere where its presence has no impact, such as the list of initializers.
 */
export class ListeningActivityHandler extends StaticHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly storage: NotificationChannelStorage;
  private readonly handler: NotificationHandler;

  public constructor(storage: NotificationChannelStorage, emitter: ActivityEmitter, handler: NotificationHandler) {
    super();
    this.storage = storage;
    this.handler = handler;

    emitter.on('changed', (topic, activity, metadata): void => {
      this.emit(topic, activity, metadata).catch((error): void => {
        this.logger.error(`Something went wrong emitting notifications: ${createErrorMessage(error)}`);
      });
    });
  }

  private async emit(
    topic: ResourceIdentifier,
    activity: VocabularyTerm<typeof AS>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    const channelIds = await this.storage.getAll(topic);

    for (const id of channelIds) {
      const channel = await this.storage.get(id);
      if (!channel) {
        // Notification channel has expired
        continue;
      }

      // Don't emit if the previous notification was too recent according to the requested rate
      if (channel.lastEmit && channel.rate && channel.rate > Date.now() - channel.lastEmit) {
        continue;
      }

      // Don't emit if we have not yet reached the requested starting time
      if (channel.startAt && channel.startAt > Date.now()) {
        continue;
      }

      // No need to wait on this to resolve before going to the next channel.
      // Prevent failed notification from blocking other notifications.
      this.handler.handleSafe({ channel, activity, topic, metadata })
        .then(async(): Promise<void> => {
          // Update the `lastEmit` value if the channel has a rate limit
          if (channel.rate) {
            channel.lastEmit = Date.now();
            return this.storage.update(channel);
          }
        })
        .catch((error): void => {
          this.logger.error(`Error trying to handle notification for ${id}: ${createErrorMessage(error)}`);
        });
    }
  }
}
