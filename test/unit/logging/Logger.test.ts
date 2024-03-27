import { BaseLogger, WrappingLogger } from '../../../src/logging/Logger';
import type { LogMetadata, SimpleLogger } from '../../../src/logging/Logger';

class DummyLogger extends BaseLogger {
  public log(): this {
    return this;
  }
}

describe('Logger', (): void => {
  describe('a BaseLogger', (): void => {
    let logger: BaseLogger;
    const metadata: LogMetadata = {
      isPrimary: true,
      pid: process.pid,
    };

    beforeEach(async(): Promise<void> => {
      logger = new DummyLogger();
      jest.spyOn(logger, 'log').mockImplementation();
    });

    it('delegates error to log.', async(): Promise<void> => {
      logger.error('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('error', 'my message', metadata);
    });

    it('warn delegates to log.', async(): Promise<void> => {
      logger.warn('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('warn', 'my message', metadata);
    });

    it('info delegates to log.', async(): Promise<void> => {
      logger.info('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('info', 'my message', metadata);
    });

    it('verbose delegates to log.', async(): Promise<void> => {
      logger.verbose('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('verbose', 'my message', metadata);
    });

    it('debug delegates to log.', async(): Promise<void> => {
      logger.debug('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('debug', 'my message', metadata);
    });

    it('silly delegates to log.', async(): Promise<void> => {
      logger.silly('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('silly', 'my message', metadata);
    });
  });

  describe('a WrappingLogger', (): void => {
    let logger: SimpleLogger;
    let wrapper: WrappingLogger;
    const metadata: LogMetadata = {
      isPrimary: true,
      pid: process.pid,
    };

    beforeEach(async(): Promise<void> => {
      logger = { log: jest.fn() };
      wrapper = new WrappingLogger(logger);
    });

    it('error delegates to the internal logger.', async(): Promise<void> => {
      wrapper.error('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('error', 'my message', metadata);
    });

    it('warn delegates to the internal logger.', async(): Promise<void> => {
      wrapper.warn('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('warn', 'my message', metadata);
    });

    it('info delegates to the internal logger.', async(): Promise<void> => {
      wrapper.info('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('info', 'my message', metadata);
    });

    it('verbose delegates to the internal logger.', async(): Promise<void> => {
      wrapper.verbose('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('verbose', 'my message', metadata);
    });

    it('debug delegates to the internal logger.', async(): Promise<void> => {
      wrapper.debug('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('debug', 'my message', metadata);
    });

    it('silly delegates to the internal logger.', async(): Promise<void> => {
      wrapper.silly('my message');
      expect(logger.log).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith('silly', 'my message', metadata);
    });
  });
});
