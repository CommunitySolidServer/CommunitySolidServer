import type { ResourceSet } from '../../../storage/ResourceSet';
import { AS } from '../../../util/Vocabularies';
import type { Notification } from '../Notification';
import type { NotificationHandlerInput } from '../NotificationHandler';
import { NotificationGenerator } from './NotificationGenerator';

/**
 * Determines the most relevant activity for a {@link Notification} in case none was provided.
 * This is relevant for the `state` feature where a notification channel needs to know the current state of a resource.
 */
export class StateNotificationGenerator extends NotificationGenerator {
  private readonly source: NotificationGenerator;
  private readonly resourceSet: ResourceSet;

  public constructor(source: NotificationGenerator, resourceSet: ResourceSet) {
    super();
    this.source = source;
    this.resourceSet = resourceSet;
  }

  public async handle(input: NotificationHandlerInput): Promise<Notification> {
    if (input.activity) {
      return this.source.handleSafe(input);
    }

    const activity = await this.resourceSet.hasResource(input.topic) ? AS.terms.Update : AS.terms.Delete;
    return this.source.handleSafe({ ...input, activity });
  }
}
