import { Readable } from 'stream';
import { guardStream } from '../../../src/util/GuardedStream';
import { readableToString } from '../../../src/util/StreamUtil';

describe('GuardedStream', (): void => {
  describe('#guardStream', (): void => {
    it('has no effect if no error is thrown.', async(): Promise<void> => {
      const stream = guardStream(Readable.from([ 'data' ]));
      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(readableToString(stream)).resolves.toBe('data');
      await expect(listen).resolves.toBeUndefined();
    });

    it('returns the stream if it is already guarded.', async(): Promise<void> => {
      const stream = guardStream(guardStream(Readable.from([ 'data' ])));
      expect(stream.listenerCount('error')).toBe(1);
      expect(stream.listenerCount('newListener')).toBe(1);
      expect(stream.listenerCount('removeListener')).toBe(0);

      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(readableToString(stream)).resolves.toBe('data');
      await expect(listen).resolves.toBeUndefined();
    });

    it('still emits errors when they happen.', async(): Promise<void> => {
      let stream = Readable.from([ 'data' ]);
      stream = guardStream(stream);
      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      stream.emit('error', new Error('error'));
      await expect(listen).rejects.toThrow(new Error('error'));
    });

    it('emits old errors when new listeners are attached.', async(): Promise<void> => {
      let stream = Readable.from([ 'data' ]);
      stream = guardStream(stream);
      stream.emit('error', new Error('error'));
      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(listen).rejects.toThrow(new Error('error'));
    });

    it('still works if error listeners get removed and added again.', async(): Promise<void> => {
      let stream = Readable.from([ 'data' ]);
      stream = guardStream(stream);

      // Make sure no unneeded listeners stay attached
      const errorCb = jest.fn();
      const errorCb2 = jest.fn();
      stream.on('error', errorCb);
      stream.on('error', errorCb2);
      expect(stream.listenerCount('error')).toBe(2);
      expect(stream.listenerCount('newListener')).toBe(0);
      expect(stream.listenerCount('removeListener')).toBe(1);
      stream.removeListener('error', errorCb2);
      expect(stream.listenerCount('error')).toBe(1);
      expect(stream.listenerCount('newListener')).toBe(0);
      expect(stream.listenerCount('removeListener')).toBe(1);
      stream.removeListener('error', errorCb);
      expect(stream.listenerCount('error')).toBe(1);
      expect(stream.listenerCount('newListener')).toBe(1);
      expect(stream.listenerCount('removeListener')).toBe(0);

      stream.emit('error', new Error('error'));

      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(listen).rejects.toThrow(new Error('error'));
    });

    it('logs a warning if nobody listens to the error.', async(): Promise<void> => {
      jest.useFakeTimers();

      let stream = Readable.from([ 'data' ]);
      stream = guardStream(stream);
      stream.emit('error', new Error('error'));

      jest.advanceTimersByTime(1000);

      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(listen).rejects.toThrow(new Error('error'));

      // No idea how to access the logger with mocks unfortunately
    });
  });
});
