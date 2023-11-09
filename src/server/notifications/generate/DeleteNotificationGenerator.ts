import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import { AS } from '../../../util/Vocabularies';
import type { Notification } from '../Notification';
import { CONTEXT_ACTIVITYSTREAMS, CONTEXT_NOTIFICATION } from '../Notification';
import type { NotificationHandlerInput } from '../NotificationHandler';
import { NotificationGenerator } from './NotificationGenerator';

/**
 * Generates a {@link Notification} for a resource that was deleted.
 * This differs from other activity notifications in that there is no state and no resource metadata
 * since the resource no longer exists.
 */
export class DeleteNotificationGenerator extends NotificationGenerator {
  public async canHandle({ activity }: NotificationHandlerInput): Promise<void> {
    if (!activity?.equals(AS.terms.Delete)) {
      throw new NotImplementedHttpError(`Only Delete activity updates are supported.`);
    }
  }

  public async handle({ topic }: NotificationHandlerInput): Promise<Notification> {
    return {
      // eslint-disable-next-line ts/naming-convention
      '@context': [
        CONTEXT_ACTIVITYSTREAMS,
        CONTEXT_NOTIFICATION,
      ],
      id: `urn:${Date.now()}:${topic.path}`,
      type: 'Delete',
      object: topic.path,
      published: new Date().toISOString(),
    };
  }
}
