import { EventEmitter } from 'node:events';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';
import type { ActivityEmitter } from '../../../../../src/server/notifications/ActivityEmitter';
import type { NotificationHandler } from '../../../../../src/server/notifications/NotificationHandler';
import { AS } from '../../../../../src/util/Vocabularies';
import { flushPromises } from '../../../../util/Util';
import { StreamingHTTPListeningActivityHandler } from '../../../../../src';

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A StreamingHTTPListeningActivityHandler', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const activity = AS.terms.Update;
  const metadata = new RepresentationMetadata();
  let emitter: ActivityEmitter;
  let notificationHandler: jest.Mocked<NotificationHandler>;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    emitter = new EventEmitter() as any;

    notificationHandler = {
      handleSafe: jest.fn().mockResolvedValue(undefined),
    } as any;

    // eslint-disable-next-line no-new
    new StreamingHTTPListeningActivityHandler(emitter, notificationHandler);
  });

  it('calls the NotificationHandler if there is an event.', async(): Promise<void> => {
    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith(expect.objectContaining({ activity, topic, metadata }));
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('logs error from notification handler.', async(): Promise<void> => {
    notificationHandler.handleSafe.mockRejectedValueOnce(new Error('bad input'));

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Error trying to handle notification for ${topic.path}: bad input`);
  });

  it('logs an error if something goes wrong handling the event.', async(): Promise<void> => {

    const erroringTopic = { get path() { throw new Error('bad event') }} as unknown as ResourceIdentifier

    emitter.emit('changed', erroringTopic, activity, metadata);

    await flushPromises();
    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Something went wrong emitting notifications: bad event`);
  });
});
