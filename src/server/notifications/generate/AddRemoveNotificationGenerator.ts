import type { ETagHandler } from '../../../storage/conditions/ETagHandler';
import type { ResourceStore } from '../../../storage/ResourceStore';
import { InternalServerError } from '../../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import { AS } from '../../../util/Vocabularies';
import type { Notification } from '../Notification';
import { CONTEXT_ACTIVITYSTREAMS, CONTEXT_NOTIFICATION } from '../Notification';
import type { NotificationHandlerInput } from '../NotificationHandler';
import { NotificationGenerator } from './NotificationGenerator';

/**
 * A {@link NotificationGenerator} specifically for Add/Remove notifications.
 * Creates the notification so the `target` is set to input topic,
 * and the `object` value is extracted from the provided metadata.
 */
export class AddRemoveNotificationGenerator extends NotificationGenerator {
  private readonly store: ResourceStore;
  private readonly eTagHandler: ETagHandler;

  public constructor(store: ResourceStore, eTagHandler: ETagHandler) {
    super();
    this.store = store;
    this.eTagHandler = eTagHandler;
  }

  public async canHandle({ activity }: NotificationHandlerInput): Promise<void> {
    if (!activity || (!activity.equals(AS.terms.Add) && !activity.equals(AS.terms.Remove))) {
      throw new NotImplementedHttpError(`Only Add/Remove activity updates are supported.`);
    }
  }

  public async handle({ activity, topic, metadata }: NotificationHandlerInput): Promise<Notification> {
    const representation = await this.store.getRepresentation(topic, {});
    representation.data.destroy();
    const state = this.eTagHandler.getETag(representation.metadata);

    const objects = metadata?.getAll(AS.terms.object);
    if (!objects || objects.length === 0) {
      throw new InternalServerError(`Missing as:object metadata for ${activity?.value} activity on ${topic.path}`);
    }
    if (objects.length > 1) {
      throw new InternalServerError(`Found more than one as:object for ${activity?.value} activity on ${topic.path}`);
    }

    return {
      // eslint-disable-next-line ts/naming-convention
      '@context': [
        CONTEXT_ACTIVITYSTREAMS,
        CONTEXT_NOTIFICATION,
      ],
      id: `urn:${Date.now()}:${topic.path}`,
      type: activity!.value.slice(AS.namespace.length),
      object: objects[0].value,
      target: topic.path,
      state,
      published: new Date().toISOString(),
    };
  }
}
