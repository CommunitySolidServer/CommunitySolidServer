import { randomUUID } from 'node:crypto';
import type { RepresentationMetadata } from '../../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../../logging/LogUtil';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { StaticHandler } from '../../../util/handlers/StaticHandler';
import { NOTIFY, type AS, type VocabularyTerm } from '../../../util/Vocabularies';
import type { ActivityEmitter } from '.././ActivityEmitter';
import type { NotificationHandler } from '.././NotificationHandler';
import { NotificationChannel } from '../NotificationChannel';

/**
 * Listens to an {@link ActivityEmitter} and calls the stored {@link NotificationHandler}s in case of an event
 * for every matching notification channel found.
 *
 * Extends {@link StaticHandler} so it can be more easily injected into a Components.js configuration.
 * No class takes this one as input, so to make sure Components.js instantiates it,
 * it needs to be added somewhere where its presence has no impact, such as the list of initializers.
 */
export class StreamingHTTPListeningActivityHandler extends StaticHandler {
  protected readonly logger = getLoggerFor(this);

  public constructor(
    emitter: ActivityEmitter,
    private readonly source: NotificationHandler
  ) {
    super();

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
    const channel: NotificationChannel = {
      // TODO decide what IRI should denote a pre-established channel
      id: `urn:uuid:${randomUUID()}`,
      type: NOTIFY.StreamingHTTPChannel2023,
      topic: topic.path,
      accept: 'text/turtle'
    }
    try {
      await this.source.handleSafe({ channel, activity, topic, metadata })
    } catch (error) {
      // TODO: do we need to catch if only one channel per topic?
      this.logger.error(`Error trying to handle notification for ${topic.path}: ${createErrorMessage(error)}`);
    }
  }
}
