import type { ResourceIdentifier } from '../../../http/representation/ResourceIdentifier';
import { NOTIFY } from '../../../util/Vocabularies';
import type { NotificationChannel } from '../NotificationChannel';

/**
 * Default StreamingHTTPChanel2023 for a topic.
 * Currently chennel description is only used internally and never sent to the client.
 * The default channel uses Turtle.
 */
export function defaultChannel(topic: ResourceIdentifier): NotificationChannel {
  return {
    id: `${topic.path}.channel`,
    type: NOTIFY.StreamingHTTPChannel2023,
    topic: topic.path,
    accept: 'text/turtle',
  };
}
