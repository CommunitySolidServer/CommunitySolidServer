import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { AS, VocabularyTerm } from '../../util/Vocabularies';
import type { NotificationChannel } from './NotificationChannel';

export interface NotificationHandlerInput {
  topic: ResourceIdentifier;
  channel: NotificationChannel;
  activity?: VocabularyTerm<typeof AS>;
  metadata?: RepresentationMetadata;
}

/**
 * Makes sure an activity gets emitted to the relevant channel.
 */
export abstract class NotificationHandler extends AsyncHandler<NotificationHandlerInput> {}
