import { Readable } from 'node:stream';
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

      await expect(readableToString(guarded)).resolves.toBe('data');
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

      expect(guarded.listenerCount('error')).toBe(1);
      expect(guarded.listenerCount('newListener')).toBe(1);
      expect(guarded.listenerCount('removeListener')).toBe(0);

      await expect(readableToString(guarded)).resolves.toBe('data');
    });

    it('emits errors when listeners are currently attached.', async(): Promise<void> => {
      const stream = guardStream(Readable.from([ 'data' ]));
      const listener = jest.fn();
      stream.on('error', listener);
      const error = new Error('error');
      stream.emit('error', error);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(error);
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

      jest.runAllTimers();

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

    it('ignores error listeners that were already attached.', async(): Promise<void> => {
      const stream = Readable.from([ 'data' ]);
      stream.addListener('error', jest.fn());
      guardStream(stream);

      stream.emit('error', new Error('error'));

      jest.advanceTimersByTime(1000);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('ignores error listeners after calling guardStream a second time.', async(): Promise<void> => {
      const stream = Readable.from([ 'data' ]);
      guardStream(stream);
      stream.addListener('error', jest.fn());

      // This will cause the above error listener to be ignored for logging purposes
      guardStream(stream);

      stream.emit('error', new Error('error'));

      jest.advanceTimersByTime(1000);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('still works if error listeners get removed and added again.', async(): Promise<void> => {
      const stream = guardStream(Readable.from([ 'data' ]));

      // Make sure no unneeded listeners stay attached
      const errorCb = jest.fn();
      const errorCb2 = jest.fn();
      stream.on('error', errorCb);
      stream.on('error', errorCb2);
      expect(stream.listenerCount('error')).toBe(3);
      expect(stream.listenerCount('newListener')).toBe(1);
      stream.removeListener('error', errorCb2);
      expect(stream.listenerCount('error')).toBe(2);
      expect(stream.listenerCount('newListener')).toBe(1);
      stream.removeListener('error', errorCb);
      expect(stream.listenerCount('error')).toBe(1);
      expect(stream.listenerCount('newListener')).toBe(1);

      const error = new Error('error');
      stream.emit('error', error);

      const errorCb3 = jest.fn();
      stream.on('error', errorCb3);

      jest.runAllTimers();

      expect(errorCb).toHaveBeenCalledTimes(0);
      expect(errorCb2).toHaveBeenCalledTimes(0);
      expect(errorCb3).toHaveBeenCalledTimes(1);
      expect(errorCb3).toHaveBeenLastCalledWith(error);
    });

    it('logs an error if nobody listens to the error.', async(): Promise<void> => {
      const errors = [ new Error('0'), new Error('1'), new Error('2') ];
      const stream = guardStream(Readable.from([ 'data' ]));
      stream.emit('error', errors[0]);

      jest.advanceTimersByTime(100);
      stream.emit('error', errors[1]);
      stream.emit('error', errors[2]);

      // Only the first error gets logged
      jest.advanceTimersByTime(900);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('No error listener was attached but error was thrown: 0');

      jest.advanceTimersByTime(1000);
      expect(logger.error).toHaveBeenCalledTimes(1);

      const errorCb = jest.fn();
      stream.on('error', errorCb);

      jest.runAllTimers();

      expect(errorCb).toHaveBeenCalledTimes(3);
      expect(errorCb).toHaveBeenNthCalledWith(1, errors[0]);
      expect(errorCb).toHaveBeenNthCalledWith(2, errors[1]);
      expect(errorCb).toHaveBeenNthCalledWith(3, errors[2]);
    });
  });
});
