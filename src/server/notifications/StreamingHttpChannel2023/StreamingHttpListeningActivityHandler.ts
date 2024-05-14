import type { RepresentationMetadata } from '../../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../../logging/LogUtil';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { StaticHandler } from '../../../util/handlers/StaticHandler';
import type { AS, VocabularyTerm } from '../../../util/Vocabularies';
import type { ActivityEmitter } from '../ActivityEmitter';
import type { NotificationHandler } from '../NotificationHandler';
import { generateChannel } from './StreamingHttp2023Util';
import type { StreamingHttpMap } from './StreamingHttpMap';

/**
 * Listens to an {@link ActivityEmitter} and calls the stored {@link NotificationHandler}s in case of an event
 * for every matching notification channel found.
 *
 * Extends {@link StaticHandler} so it can be more easily injected into a Components.js configuration.
 * No class takes this one as input, so to make sure Components.js instantiates it,
 * it needs to be added somewhere where its presence has no impact, such as the list of initializers.
 */
export class StreamingHttpListeningActivityHandler extends StaticHandler {
  protected readonly logger = getLoggerFor(this);

  public constructor(
    emitter: ActivityEmitter,
    private readonly streamMap: StreamingHttpMap,
    private readonly source: NotificationHandler,
  ) {
    super();

    emitter.on('changed', (topic, activity, metadata): void => {
      if (this.streamMap.has(topic.path)) {
        this.emit(topic, activity, metadata).catch(
          (error): void => {
            this.logger.error(`Error trying to handle notification for ${topic.path}: ${createErrorMessage(error)}`);
          },
        );
      }
    });
  }

  private async emit(
    topic: ResourceIdentifier,
    activity: VocabularyTerm<typeof AS>,
    metadata: RepresentationMetadata,
  ): Promise<void> {
    const channel = generateChannel(topic);
    return this.source.handleSafe({ channel, activity, topic, metadata });
  }
}
