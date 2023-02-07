import { BasicRepresentation } from '../../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { ComposedNotificationHandler } from '../../../../src/server/notifications/ComposedNotificationHandler';
import type { NotificationGenerator } from '../../../../src/server/notifications/generate/NotificationGenerator';
import type { Notification } from '../../../../src/server/notifications/Notification';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type { NotificationEmitter } from '../../../../src/server/notifications/NotificationEmitter';
import type { NotificationSerializer } from '../../../../src/server/notifications/serialize/NotificationSerializer';

describe('A ComposedNotificationHandler', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const notification: Notification = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://www.w3.org/ns/solid/notification/v1',
    ],
    id: `urn:123:http://example.com/foo`,
    type: 'Update',
    object: 'http://example.com/foo',
    published: '123',
    state: '123',
  };
  let channel: NotificationChannel;
  const representation = new BasicRepresentation();
  let generator: jest.Mocked<NotificationGenerator>;
  let serializer: jest.Mocked<NotificationSerializer>;
  let emitter: jest.Mocked<NotificationEmitter>;
  let handler: ComposedNotificationHandler;

  beforeEach(async(): Promise<void> => {
    channel = {
      id: 'id',
      topic: 'http://example.com/foo',
      type: 'type',
    };

    generator = {
      canHandle: jest.fn(),
      handle: jest.fn().mockResolvedValue(notification),
    } as any;

    serializer = {
      handleSafe: jest.fn().mockResolvedValue(representation),
    } as any;

    emitter = {
      handleSafe: jest.fn(),
    } as any;

    handler = new ComposedNotificationHandler({ generator, serializer, emitter });
  });

  it('can only handle input supported by the generator.', async(): Promise<void> => {
    await expect(handler.canHandle({ channel, topic })).resolves.toBeUndefined();
    generator.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(handler.canHandle({ channel, topic })).rejects.toThrow('bad input');
  });

  it('calls the three wrapped classes in order.', async(): Promise<void> => {
    await expect(handler.handle({ channel, topic })).resolves.toBeUndefined();
    expect(generator.handle).toHaveBeenCalledTimes(1);
    expect(generator.handle).toHaveBeenLastCalledWith({ channel, topic });
    expect(serializer.handleSafe).toHaveBeenCalledTimes(1);
    expect(serializer.handleSafe).toHaveBeenLastCalledWith({ channel, notification });
    expect(emitter.handleSafe).toHaveBeenCalledTimes(1);
    expect(emitter.handleSafe).toHaveBeenLastCalledWith({ channel, representation });
  });

  it('does not emit the notification if its state matches the channel state.', async(): Promise<void> => {
    channel.state = notification.state;
    await expect(handler.handle({ channel, topic })).resolves.toBeUndefined();
    expect(generator.handle).toHaveBeenCalledTimes(1);
    expect(generator.handle).toHaveBeenLastCalledWith({ channel, topic });
    expect(serializer.handleSafe).toHaveBeenCalledTimes(0);
    expect(emitter.handleSafe).toHaveBeenCalledTimes(0);
  });
});
