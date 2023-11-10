import type { ETagHandler } from '../../../storage/conditions/ETagHandler';
import type { ResourceStore } from '../../../storage/ResourceStore';
import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import { AS } from '../../../util/Vocabularies';
import type { Notification } from '../Notification';
import { CONTEXT_ACTIVITYSTREAMS, CONTEXT_NOTIFICATION } from '../Notification';
import type { NotificationHandlerInput } from '../NotificationHandler';
import { NotificationGenerator } from './NotificationGenerator';

/**
 * A {@link NotificationGenerator} that creates a {@link Notification} by using the provided activity as type.
 * Requests metadata of the topic from the {@link ResourceStore} to fill in the details.
 */
export class ActivityNotificationGenerator extends NotificationGenerator {
  private readonly store: ResourceStore;
  private readonly eTagHandler: ETagHandler;

  public constructor(store: ResourceStore, eTagHandler: ETagHandler) {
    super();
    this.store = store;
    this.eTagHandler = eTagHandler;
  }

  public async canHandle({ activity }: NotificationHandlerInput): Promise<void> {
    if (!activity) {
      throw new NotImplementedHttpError(`Only defined activities are supported.`);
    }
  }

  public async handle({ topic, activity }: NotificationHandlerInput): Promise<Notification> {
    const representation = await this.store.getRepresentation(topic, {});
    representation.data.destroy();
    const state = this.eTagHandler.getETag(representation.metadata);

    return {
      // eslint-disable-next-line ts/naming-convention
      '@context': [
        CONTEXT_ACTIVITYSTREAMS,
        CONTEXT_NOTIFICATION,
      ],
      id: `urn:${Date.now()}:${topic.path}`,
      type: activity!.value.slice(AS.namespace.length),
      object: topic.path,
      state,
      published: new Date().toISOString(),
    };
  }
}
