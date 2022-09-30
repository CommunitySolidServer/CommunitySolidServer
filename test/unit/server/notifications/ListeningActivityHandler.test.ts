import { EventEmitter } from 'events';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import type { ActivityEmitter } from '../../../../src/server/notifications/ActivityEmitter';
import { ListeningActivityHandler } from '../../../../src/server/notifications/ListeningActivityHandler';
import type { NotificationHandler } from '../../../../src/server/notifications/NotificationHandler';
import type { SubscriptionInfo, SubscriptionStorage } from '../../../../src/server/notifications/SubscriptionStorage';
import { AS } from '../../../../src/util/Vocabularies';
import { flushPromises } from '../../../util/Util';

jest.mock('../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A ListeningActivityHandler', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const activity = AS.terms.Update;
  let info: SubscriptionInfo;
  let storage: jest.Mocked<SubscriptionStorage>;
  let emitter: ActivityEmitter;
  let notificationHandler: jest.Mocked<NotificationHandler>;
  let handler: ListeningActivityHandler;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    info = {
      id: 'id',
      topic: 'http://example.com/foo',
      type: 'type',
      features: {},
      lastEmit: 0,
    };

    storage = {
      getAll: jest.fn().mockResolvedValue([ info.id ]),
      get: jest.fn().mockResolvedValue(info),
    } as any;

    emitter = new EventEmitter() as any;

    notificationHandler = {
      handleSafe: jest.fn().mockResolvedValue(undefined),
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handler = new ListeningActivityHandler(storage, emitter, notificationHandler);
  });

  it('calls the NotificationHandler if there is an event.', async(): Promise<void> => {
    emitter.emit('changed', topic, activity);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ info, activity, topic });
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('does not emit an event on subscriptions if their rate does not yet allow it.', async(): Promise<void> => {
    info.rate = 100000;
    info.lastEmit = Date.now();

    emitter.emit('changed', topic, activity);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('does not stop if one subscription causes an error.', async(): Promise<void> => {
    storage.getAll.mockResolvedValue([ info.id, info.id ]);
    notificationHandler.handleSafe.mockRejectedValueOnce(new Error('bad input'));

    emitter.emit('changed', topic, activity);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Error trying to handle notification for ${info.id}: bad input`);
  });

  it('logs an error if something goes wrong handling the event.', async(): Promise<void> => {
    storage.getAll.mockRejectedValue(new Error('bad event'));

    emitter.emit('changed', topic, activity);

    await flushPromises();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Something went wrong emitting notifications: bad event`);
  });

  it('ignores undefined subscriptions.', async(): Promise<void> => {
    storage.get.mockResolvedValue(undefined);

    emitter.emit('changed', topic, activity);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });
});
