import { EventEmitter } from 'node:events';
import { RepresentationMetadata } from '../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import type { ActivityEmitter } from '../../../../src/server/notifications/ActivityEmitter';
import { ListeningActivityHandler } from '../../../../src/server/notifications/ListeningActivityHandler';
import type { NotificationChannel } from '../../../../src/server/notifications/NotificationChannel';
import type {
  NotificationChannelStorage,
} from '../../../../src/server/notifications/NotificationChannelStorage';
import type { NotificationHandler } from '../../../../src/server/notifications/NotificationHandler';
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
  const metadata = new RepresentationMetadata();
  let channel: NotificationChannel;
  let storage: jest.Mocked<NotificationChannelStorage>;
  let emitter: ActivityEmitter;
  let notificationHandler: jest.Mocked<NotificationHandler>;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    channel = {
      id: 'id',
      topic: 'http://example.com/foo',
      type: 'type',
    };

    storage = {
      getAll: jest.fn().mockResolvedValue([ channel.id ]),
      get: jest.fn().mockResolvedValue(channel),
      update: jest.fn(),
    } as any;

    emitter = new EventEmitter() as any;

    notificationHandler = {
      handleSafe: jest.fn().mockResolvedValue(undefined),
    } as any;

    // eslint-disable-next-line no-new
    new ListeningActivityHandler(storage, emitter, notificationHandler);
  });

  it('calls the NotificationHandler if there is an event.', async(): Promise<void> => {
    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ channel, activity, topic, metadata });
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(storage.update).toHaveBeenCalledTimes(0);
  });

  it('updates the lastEmit value of the channel if it has a rate limit.', async(): Promise<void> => {
    jest.useFakeTimers();
    channel.rate = 10 * 1000;
    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith({ channel, activity, topic, metadata });
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(storage.update).toHaveBeenCalledTimes(1);
    expect(storage.update).toHaveBeenLastCalledWith({
      ...channel,
      lastEmit: Date.now(),
    });
    jest.useRealTimers();
  });

  it('does not emit an event on channels if their rate does not yet allow it.', async(): Promise<void> => {
    channel.rate = 100000;
    channel.lastEmit = Date.now();

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('does not emit an event on channels if their start time has not been reached.', async(): Promise<void> => {
    channel.startAt = Date.now() + 100000;

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('does not stop if one channel causes an error.', async(): Promise<void> => {
    storage.getAll.mockResolvedValue([ channel.id, channel.id ]);
    notificationHandler.handleSafe.mockRejectedValueOnce(new Error('bad input'));

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Error trying to handle notification for ${channel.id}: bad input`);
  });

  it('logs an error if something goes wrong handling the event.', async(): Promise<void> => {
    storage.getAll.mockRejectedValue(new Error('bad event'));

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Something went wrong emitting notifications: bad event`);
  });

  it('ignores undefined channels.', async(): Promise<void> => {
    storage.get.mockResolvedValue(undefined);

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });
});
