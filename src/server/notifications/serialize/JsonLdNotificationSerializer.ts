import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import type { Representation } from '../../../http/representation/Representation';
import { APPLICATION_LD_JSON } from '../../../util/ContentTypes';
import type { NotificationSerializerInput } from './NotificationSerializer';
import { NotificationSerializer } from './NotificationSerializer';

/**
 * Serializes a Notification into a JSON-LD string.
 */
export class JsonLdNotificationSerializer extends NotificationSerializer {
  public async handle({ notification }: NotificationSerializerInput): Promise<Representation> {
    return new BasicRepresentation(JSON.stringify(notification), APPLICATION_LD_JSON);
  }
}
