import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { AS, VocabularyTerm } from '../../util/Vocabularies';
import type { NotificationChannelInfo } from './NotificationChannelStorage';

export interface NotificationHandlerInput {
  topic: ResourceIdentifier;
  info: NotificationChannelInfo;
  activity?: VocabularyTerm<typeof AS>;
}

/**
 * Makes sure an activity gets emitted to the relevant channel based on the given info.
 */
export abstract class NotificationHandler extends AsyncHandler<NotificationHandlerInput> {}
