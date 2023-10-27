import type { Logger } from '../../../src/logging/Logger';
import { setSafeInterval } from '../../../src/util/TimerUtil';
import { flushPromises } from '../../util/Util';

jest.useFakeTimers();

describe('TimerUtil', (): void => {
  describe('#setSafeInterval', (): void => {
    let logger: jest.Mocked<Logger>;
    let callback: jest.Mock;

    beforeEach(async(): Promise<void> => {
      logger = { error: jest.fn() } as any;
      callback = jest.fn();
    });

    it('creates a working interval.', async(): Promise<void> => {
      const timer = setSafeInterval(logger, 'message', callback, 1000, 'argument');

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenLastCalledWith('argument');
      expect(logger.error).toHaveBeenCalledTimes(0);

      clearInterval(timer);
    });

    it('logs an error if something went wrong in the callback.', async(): Promise<void> => {
      const timer = setSafeInterval(logger, 'message', callback, 1000, 'argument');
      callback.mockImplementationOnce((): never => {
        throw new Error('callback error');
      });

      jest.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenLastCalledWith('argument');
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenLastCalledWith('Error during interval callback: message - callback error');

      clearInterval(timer);
    });

    it('correctly handles errors in async callbacks.', async(): Promise<void> => {
      const promCallback = jest.fn().mockRejectedValue(new Error('callback error'));
      const timer = setSafeInterval(logger, 'message', promCallback, 1000, 'argument');

      jest.advanceTimersByTime(1000);
      await flushPromises();

      expect(promCallback).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenLastCalledWith('Error during interval callback: message - callback error');

      clearInterval(timer);
    });
  });
});
