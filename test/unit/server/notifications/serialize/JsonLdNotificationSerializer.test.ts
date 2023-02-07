import type { Notification } from '../../../../../src/server/notifications/Notification';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import {
  JsonLdNotificationSerializer,
} from '../../../../../src/server/notifications/serialize/JsonLdNotificationSerializer';
import { readableToString } from '../../../../../src/util/StreamUtil';

describe('A JsonLdNotificationSerializer', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
  };
  const notification: Notification = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: `urn:123:http://example.com/foo`,
    type: 'Update',
    object: 'http://example.com/foo',
    published: '123',
  };

  const serializer = new JsonLdNotificationSerializer();

  it('converts notifications into JSON-LD.', async(): Promise<void> => {
    const representation = await serializer.handle({ notification, channel });
    expect(representation.metadata.contentType).toBe('application/ld+json');
    expect(JSON.parse(await readableToString(representation.data))).toEqual(notification);
  });
});
