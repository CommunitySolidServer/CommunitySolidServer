import { BaseStateHandler } from '../../../../src/server/notifications/BaseStateHandler';
import type { NotificationHandler } from '../../../../src/server/notifications/NotificationHandler';
import type { SubscriptionInfo, SubscriptionStorage } from '../../../../src/server/notifications/SubscriptionStorage';

describe('A BaseStateHandler', (): void => {
  let info: SubscriptionInfo;
  let notificationHandler: jest.Mocked<NotificationHandler>;
  let storage: jest.Mocked<SubscriptionStorage>;
  let handler: BaseStateHandler;

  beforeEach(async(): Promise<void> => {
    info = {
      id: 'id',
      topic: 'http://example.com/foo',
      type: 'type',
      features: {},
      lastEmit: 0,
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
    await expect(handler.handleSafe({ info })).resolves.toBeUndefined();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    // Note that jest stores a reference to the input object so we can't see that the state value was still there
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ topic: { path: info.topic }, info });
    expect(info.state).toBeUndefined();
    expect(storage.update).toHaveBeenCalledTimes(1);
    expect(storage.update).toHaveBeenLastCalledWith(info);
  });

  it('does not delete the state parameter if something goes wrong.', async(): Promise<void> => {
    notificationHandler.handleSafe.mockRejectedValue(new Error('bad input'));
    await expect(handler.handleSafe({ info })).resolves.toBeUndefined();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ topic: { path: info.topic }, info });
    expect(info.state).toBe('123');
    expect(storage.update).toHaveBeenCalledTimes(0);
  });
});
