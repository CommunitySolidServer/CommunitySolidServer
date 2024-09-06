import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { Logger } from '../../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../../src/logging/LogUtil';
import type { ActivityEmitter } from '../../../../../src/server/notifications/ActivityEmitter';
import type { NotificationHandler } from '../../../../../src/server/notifications/NotificationHandler';
import { AS } from '../../../../../src/util/Vocabularies';
import { flushPromises } from '../../../../util/Util';
import { StreamingHttpListeningActivityHandler, StreamingHttpMap } from '../../../../../src';

jest.mock('../../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A StreamingHttpListeningActivityHandler', (): void => {
  const logger: jest.Mocked<Logger> = getLoggerFor('mock') as any;
  const topic: ResourceIdentifier = { path: 'http://example.com/foo' };
  const activity = AS.terms.Update;
  const metadata = new RepresentationMetadata();
  let emitter: ActivityEmitter;
  let streamMap: StreamingHttpMap;
  let notificationHandler: jest.Mocked<NotificationHandler>;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();
    emitter = new EventEmitter() as any;
    streamMap = new StreamingHttpMap();

    notificationHandler = {
      handleSafe: jest.fn().mockResolvedValue(undefined),
    } as any;

    // eslint-disable-next-line no-new
    new StreamingHttpListeningActivityHandler(emitter, streamMap, notificationHandler);
  });

  it('calls the NotificationHandler if there is an event and a stream.', async(): Promise<void> => {
    streamMap.add(topic.path, new PassThrough());
    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(1);
    expect(notificationHandler.handleSafe).toHaveBeenLastCalledWith(
      expect.objectContaining({ activity, topic, metadata }),
    );
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('does not call the NotificationHandler if there is an event but no stream.', async(): Promise<void> => {
    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(notificationHandler.handleSafe).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it('logs error from notification handler.', async(): Promise<void> => {
    streamMap.add(topic.path, new PassThrough());
    notificationHandler.handleSafe.mockRejectedValueOnce(new Error('bad input'));

    emitter.emit('changed', topic, activity, metadata);

    await flushPromises();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenLastCalledWith(`Error trying to handle notification for ${topic.path}: bad input`);
  });
});
