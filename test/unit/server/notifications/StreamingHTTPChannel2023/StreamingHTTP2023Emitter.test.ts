import type { PassThrough } from 'stream';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import {
  StreamingHTTP2023Emitter,
} from '../../../../../src/server/notifications/StreamingHTTPChannel2023/StreamingHTTP2023Emitter';
import { WrappedSetMultiMap } from '../../../../../src/util/map/WrappedSetMultiMap';
import type { StreamingHTTPMap } from '../../../../../src';

describe('A StreamingHTTP2023Emitter', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
  };

  let stream: jest.Mocked<PassThrough>;
  let streamMap: StreamingHTTPMap;
  let emitter: StreamingHTTP2023Emitter;

  beforeEach(async(): Promise<void> => {
    stream = {
      write: jest.fn(),
    } as any;

    streamMap = new WrappedSetMultiMap();

    emitter = new StreamingHTTP2023Emitter(streamMap);
  });

  it('emits notifications to the stored Streams.', async(): Promise<void> => {
    streamMap.add(channel.topic, stream);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(stream.write).toHaveBeenCalledTimes(1);
    expect(stream.write).toHaveBeenLastCalledWith('notification');
  });

  it('destroys the representation if there is no matching Stream.', async(): Promise<void> => {
    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(stream.write).toHaveBeenCalledTimes(0);
    expect(representation.data.destroyed).toBe(true);
  });

  it('can write to multiple matching Streams.', async(): Promise<void> => {
    const stream2: jest.Mocked<PassThrough> = {
      write: jest.fn(),
    } as any;

    streamMap.add(channel.topic, stream);
    streamMap.add(channel.topic, stream2);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(stream.write).toHaveBeenCalledTimes(1);
    expect(stream.write).toHaveBeenLastCalledWith('notification');
    expect(stream2.write).toHaveBeenCalledTimes(1);
    expect(stream2.write).toHaveBeenLastCalledWith('notification');
  });

  it('only writes to the matching topic Streams.', async(): Promise<void> => {
    const stream2: jest.Mocked<PassThrough> = {
      write: jest.fn(),
    } as any;
    const channel2: NotificationChannel = {
      ...channel,
      id: 'other id',
      topic: 'other topic'
    };

    streamMap.add(channel.topic, stream);
    streamMap.add(channel2.topic, stream2);

    const representation = new BasicRepresentation('notification', 'text/plain');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(stream.write).toHaveBeenCalledTimes(1);
    expect(stream.write).toHaveBeenLastCalledWith('notification');
    expect(stream2.write).toHaveBeenCalledTimes(0);
  });
});
