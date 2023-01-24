import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { NotificationChannelInfo } from '../../../../src/server/notifications/NotificationChannelStorage';
import type { NotificationHandler } from '../../../../src/server/notifications/NotificationHandler';
import { TypedNotificationHandler } from '../../../../src/server/notifications/TypedNotificationHandler';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A TypedNotificationHandler', (): void => {
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const info: NotificationChannelInfo = {
    id: 'id',
    topic: topic.path,
    type: 'NotificationChannelType',
    features: {},
    lastEmit: 0,
  };
  let source: jest.Mocked<NotificationHandler>;
  let handler: TypedNotificationHandler;

  beforeEach(async(): Promise<void> => {
    source = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      handleSafe: jest.fn(),
    };

    handler = new TypedNotificationHandler(info.type, source);
  });

  it('requires the input info to have the correct type.', async(): Promise<void> => {
    await expect(handler.canHandle({ info, topic })).resolves.toBeUndefined();

    const wrongInfo = {
      ...info,
      type: 'somethingElse',
    };
    await expect(handler.canHandle({ info: wrongInfo, topic })).rejects.toThrow(NotImplementedHttpError);
  });

  it('rejects input the source handler can not handle.', async(): Promise<void> => {
    source.canHandle.mockRejectedValue(new Error('bad input'));
    await expect(handler.canHandle({ info, topic })).rejects.toThrow('bad input');
  });

  it('calls the source handle function.', async(): Promise<void> => {
    await expect(handler.handle({ info, topic })).resolves.toBeUndefined();
    expect(source.handle).toHaveBeenCalledTimes(1);
    expect(source.handle).toHaveBeenLastCalledWith({ info, topic });
  });
});
