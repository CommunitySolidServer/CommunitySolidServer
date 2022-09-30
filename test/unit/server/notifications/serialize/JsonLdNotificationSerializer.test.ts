import type { Notification } from '../../../../../src/server/notifications/Notification';
import {
  JsonLdNotificationSerializer,
} from '../../../../../src/server/notifications/serialize/JsonLdNotificationSerializer';
import type { SubscriptionInfo } from '../../../../../src/server/notifications/SubscriptionStorage';
import { readableToString } from '../../../../../src/util/StreamUtil';

describe('A JsonLdNotificationSerializer', (): void => {
  const info: SubscriptionInfo = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
    features: {},
    lastEmit: 0,
  };
  const notification: Notification = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: `urn:123:http://example.com/foo`,
    type: [ 'Update' ],
    object: {
      id: 'http://example.com/foo',
      type: [],
    },
    published: '123',
  };

  const serializer = new JsonLdNotificationSerializer();

  it('converts notifications into JSON-LD.', async(): Promise<void> => {
    const representation = await serializer.handle({ notification, info });
    expect(representation.metadata.contentType).toBe('application/ld+json');
    expect(JSON.parse(await readableToString(representation.data))).toEqual(notification);
  });
});
