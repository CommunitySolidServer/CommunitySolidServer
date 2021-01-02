import { Readable } from 'stream';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import { guardStream, isGuarded } from '../../../src/util/GuardedStream';
import { readableToString } from '../../../src/util/StreamUtil';

jest.mock('../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { error: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});
const logger: jest.Mocked<Logger> = getLoggerFor('GuardedStream') as any;

jest.useFakeTimers();

describe('GuardedStream', (): void => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('#guardStream', (): void => {
    it('has no effect if no error is thrown.', async(): Promise<void> => {
      const stream = Readable.from([ 'data' ]);
      expect(isGuarded(stream)).toBe(false);
      const guarded = guardStream(stream);
      expect(guarded).toBe(stream);
      expect(isGuarded(stream)).toBe(true);
      expect(isGuarded(guarded)).toBe(true);

      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(readableToString(stream)).resolves.toBe('data');
      await expect(listen).resolves.toBeUndefined();
    });

    it('returns the stream if it is already guarded.', async(): Promise<void> => {
      const stream = Readable.from([ 'data' ]);
      expect(isGuarded(stream)).toBe(false);
      const guarded = guardStream(stream);
      expect(guarded).toBe(stream);
      expect(isGuarded(stream)).toBe(true);
      expect(isGuarded(guarded)).toBe(true);
      expect(guardStream(guarded)).toBe(stream);
      expect(isGuarded(stream)).toBe(true);
      expect(isGuarded(guarded)).toBe(true);

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

    it('emits errors when listeners are currently attached.', async(): Promise<void> => {
      const stream = guardStream(Readable.from([ 'data' ]));
      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      stream.emit('error', new Error('error'));
      await expect(listen).rejects.toThrow(new Error('error'));
    });

    it('emits guarded errors when new listeners are attached.', async(): Promise<void> => {
      const errors = [ new Error('0'), new Error('1') ];
      const stream = guardStream(Readable.from([ 'data' ]));
      stream.emit('error', errors[0]);
      stream.emit('error', errors[1]);

      const errorListeners = [ jest.fn(), jest.fn(), jest.fn() ];
      stream.addListener('error', errorListeners[0]);
      stream.addListener('error', errorListeners[1]);
      stream.addListener('error', errorListeners[2]);
      const endListener = jest.fn();
      stream.addListener('end', endListener);

      expect(errorListeners[0]).toHaveBeenCalledTimes(0);
      expect(errorListeners[1]).toHaveBeenCalledTimes(0);
      expect(errorListeners[2]).toHaveBeenCalledTimes(0);
      expect(endListener).toHaveBeenCalledTimes(0);

      await new Promise((resolve): any => setImmediate(resolve));

      expect(errorListeners[0]).toHaveBeenCalledTimes(2);
      expect(errorListeners[0]).toHaveBeenNthCalledWith(1, errors[0]);
      expect(errorListeners[0]).toHaveBeenNthCalledWith(2, errors[1]);
      expect(errorListeners[1]).toHaveBeenCalledTimes(2);
      expect(errorListeners[1]).toHaveBeenNthCalledWith(1, errors[0]);
      expect(errorListeners[1]).toHaveBeenNthCalledWith(2, errors[1]);
      expect(errorListeners[2]).toHaveBeenCalledTimes(2);
      expect(errorListeners[1]).toHaveBeenNthCalledWith(1, errors[0]);
      expect(errorListeners[1]).toHaveBeenNthCalledWith(2, errors[1]);
      expect(endListener).toHaveBeenCalledTimes(0);
    });

    it('does not time out when a listener was already attached.', async(): Promise<void> => {
      const stream = Readable.from([ 'data' ]);
      stream.addListener('error', jest.fn());
      guardStream(stream);

      stream.emit('error', new Error('error'));

      jest.advanceTimersByTime(1000);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });

    it('still works if error listeners get removed and added again.', async(): Promise<void> => {
      const stream = guardStream(Readable.from([ 'data' ]));

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
      const error = new Error('failure');
      const stream = guardStream(Readable.from([ 'data' ]));
      stream.emit('error', error);

      jest.advanceTimersByTime(100);
      stream.emit('error', new Error('other'));
      stream.emit('error', new Error('other'));

      jest.advanceTimersByTime(900);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'No error listener was attached but error was thrown: failure', { error },
      );

      jest.advanceTimersByTime(1000);
      expect(logger.error).toHaveBeenCalledTimes(1);

      const listen = new Promise((resolve, reject): void => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await expect(listen).rejects.toThrow(error);
    });
  });
});
