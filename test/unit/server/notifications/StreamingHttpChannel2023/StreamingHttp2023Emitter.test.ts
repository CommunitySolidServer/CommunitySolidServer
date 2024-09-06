import { PassThrough } from 'node:stream';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import type { NotificationChannel } from '../../../../../src/server/notifications/NotificationChannel';
import {
  StreamingHttp2023Emitter,
} from '../../../../../src/server/notifications/StreamingHttpChannel2023/StreamingHttp2023Emitter';
import { WrappedSetMultiMap } from '../../../../../src/util/map/WrappedSetMultiMap';
import type { Representation, StreamingHttpMap } from '../../../../../src';

describe('A StreamingHttp2023Emitter', (): void => {
  const channel: NotificationChannel = {
    id: 'id',
    topic: 'http://example.com/foo',
    type: 'type',
  };
  const chunk = 'notification';

  let stream: jest.Mocked<PassThrough>;
  let streamMap: StreamingHttpMap;
  let emitter: StreamingHttp2023Emitter;
  let representation: BasicRepresentation;

  beforeEach(async(): Promise<void> => {
    stream = jest.mocked(new PassThrough());
    streamMap = new WrappedSetMultiMap();
    emitter = new StreamingHttp2023Emitter(streamMap);
    representation = new BasicRepresentation(chunk, 'text/plain');
  });

  it('emits notifications to the stored Streams.', async(): Promise<void> => {
    streamMap.add(channel.topic, stream);

    const spy = jest.spyOn(stream, 'write');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(chunk);
  });

  it('destroys the representation if there is no matching Stream.', async(): Promise<void> => {
    const spy = jest.spyOn(stream, 'write');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(0);
    expect(representation.data.destroyed).toBe(true);
  });

  it('can write to multiple matching Streams.', async(): Promise<void> => {
    const stream2 = jest.mocked(new PassThrough());

    streamMap.add(channel.topic, stream);
    streamMap.add(channel.topic, stream2);

    const spy = jest.spyOn(stream, 'write');
    const spy2 = jest.spyOn(stream2, 'write');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(chunk);
    expect(spy2).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledWith(chunk);
  });

  it('only writes to the matching topic Streams.', async(): Promise<void> => {
    const stream2 = jest.mocked(new PassThrough());
    const channel2: NotificationChannel = {
      ...channel,
      id: 'other id',
      topic: 'other topic',
    };

    streamMap.add(channel.topic, stream);
    streamMap.add(channel2.topic, stream2);

    const spy = jest.spyOn(stream, 'write');
    const spy2 = jest.spyOn(stream2, 'write');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(chunk);
    expect(spy2).not.toHaveBeenCalled();
  });

  it('emits notifications in a single chunk.', async(): Promise<void> => {
    streamMap.add(channel.topic, stream);
    const serializationStream = new PassThrough();
    // Use two chunks for the serialization stream
    serializationStream.write('foo');
    serializationStream.end('bar');
    representation = {
      data: serializationStream,
    } as unknown as Representation;

    const spy = jest.spyOn(stream, 'write');
    await expect(emitter.handle({ channel, representation })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith('foobar');
  });
});
