import { BaseStateHandler } from '../../../../src/server/notifications/BaseStateHandler';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type {
  NotificationChannelStorage,
} from '../../../../src/server/notifications/NotificationChannelStorage';
import type { NotificationHandler } from '../../../../src/server/notifications/NotificationHandler';

describe('A BaseStateHandler', (): void => {
  let channel: NotificationChannel;
  let notificationHandler: jest.Mocked<NotificationHandler>;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let handler: BaseStateHandler;

  beforeEach(async(): Promise<void> => {
    channel = {
      id: 'id',
      topic: 'http://exa mple.com/foo',
      type: 'type',
      state: '123',
    };

    notificationHandler = {
      handleSafe: jest.fn(),
    } as any;

    storage = {
      update: jest.fn(),
    } as any;

    handler = new BaseStateHandler(notificationHandler, storage);
  });

  it('calls the handler if there is a trigger.', async(): Promise<void> => {
    await expect(handler.handleSafe({ channel })).resolves.toBeUndefined();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    // Note that jest stores a reference to the input object so we can't see that the state value was still there
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ topic: { path: channel.topic }, channel });
    expect(channel.state).toBeUndefined();
    expect(storage.update).toHaveBeenCalledTimes(1);
    expect(storage.update).toHaveBeenLastCalledWith(channel);
  });

  it('does not delete the state parameter if something goes wrong.', async(): Promise<void> => {
    notificationHandler.handleSafe.mockRejectedValue(new Error('bad input'));
    await expect(handler.handleSafe({ channel })).resolves.toBeUndefined();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ topic: { path: channel.topic }, channel });
    expect(channel.state).toBe('123');
    expect(storage.update).toHaveBeenCalledTimes(0);
  });
});
