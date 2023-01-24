import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../../../../src/http/representation/Representation';
import type { Notification } from '../../../../../src/server/notifications/Notification';
import type { NotificationChannelInfo } from '../../../../../src/server/notifications/NotificationChannelStorage';
import {
  ConvertingNotificationSerializer,
} from '../../../../../src/server/notifications/serialize/ConvertingNotificationSerializer';
import type { NotificationSerializer } from '../../../../../src/server/notifications/serialize/NotificationSerializer';
import type { RepresentationConverter } from '../../../../../src/storage/conversion/RepresentationConverter';

describe('A ConvertingNotificationSerializer', (): void => {
  let info: NotificationChannelInfo;
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
  let representation: Representation;
  let source: jest.Mocked<NotificationSerializer>;
  let converter: jest.Mocked<RepresentationConverter>;
  let serializer: ConvertingNotificationSerializer;

  beforeEach(async(): Promise<void> => {
    info = {
      id: 'id',
      topic: 'http://example.com/foo',
      type: 'type',
      features: {},
      lastEmit: 0,
    };

    representation = new BasicRepresentation();

    source = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(representation),
    } as any;

    converter = {
      handleSafe: jest.fn(({ representation: rep }): Representation => rep),
    } as any;

    serializer = new ConvertingNotificationSerializer(source, converter);
  });

  it('can handle input its source can handle.', async(): Promise<void> => {
    await expect(serializer.canHandle({ info, notification })).resolves.toBeUndefined();
    source.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(serializer.canHandle({ info, notification })).rejects.toThrow('bad input');
  });

  it('returns the source result if there is no accept value.', async(): Promise<void> => {
    await expect(serializer.handle({ info, notification })).resolves.toBe(representation);
    expect(converter.handleSafe).toHaveBeenCalledTimes(0);
  });

  it('converts the source result if there is an accept value.', async(): Promise<void> => {
    info.accept = 'text/turtle';
    await expect(serializer.handle({ info, notification })).resolves.toBe(representation);
    expect(converter.handleSafe).toHaveBeenCalledTimes(1);
    expect(converter.handleSafe).toHaveBeenLastCalledWith({
      representation,
      preferences: { type: { 'text/turtle': 1 }},
      identifier: { path: notification.id },
    });
  });
});
