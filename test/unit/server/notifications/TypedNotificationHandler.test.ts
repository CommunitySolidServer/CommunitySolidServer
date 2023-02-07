import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type { NotificationHandler } from '../../../../src/server/notifications/NotificationHandler';
import { TypedNotificationHandler } from '../../../../src/server/notifications/TypedNotificationHandler';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A TypedNotificationHandler', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const channel: NotificationChannel = {
    id: 'id',
    topic: topic.path,
    type: 'NotificationChannelType',
  };
  let source: jest.Mocked<NotificationHandler>;
  let handler: TypedNotificationHandler;

  beforeEach(async(): Promise<void> => {
    source = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      handleSafe: jest.fn(),
    };

    handler = new TypedNotificationHandler(channel.type, source);
  });

  it('requires the input channel to have the correct type.', async(): Promise<void> => {
    await expect(handler.canHandle({ channel, topic })).resolves.toBeUndefined();

    const wrongChannel = {
      ...channel,
      type: 'somethingElse',
    };
    await expect(handler.canHandle({ channel: wrongChannel, topic })).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects input the source handler can not handle.', async(): Promise<void> => {
    source.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(handler.canHandle({ channel, topic })).rejects.toThrow('bad input');
  });

  it('calls the source handle function.', async(): Promise<void> => {
    await expect(handler.handle({ channel, topic })).resolves.toBeUndefined();
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith({ channel, topic });
  });
});
