import { Logger } from '../../../src/logging/Logger';

describe('Logger', (): void => {
  let logger: Logger;
  beforeEach(async(): Promise<void> => {
    logger = new (Logger as any)();
    logger.log = jest.fn();
  });

  it('Error delegates to log.', async(): Promise<void> => {
    logger.error('my message');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('error', 'my message');
  });

  it('Warn delegates to log.', async(): Promise<void> => {
    logger.warn('my message');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('warn', 'my message');
  });

  it('Info delegates to log.', async(): Promise<void> => {
    logger.info('my message');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('info', 'my message');
  });
  it('Verbose delegates to log.', async(): Promise<void> => {
    logger.verbose('my message');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('verbose', 'my message');
  });

  it('Debug delegates to log.', async(): Promise<void> => {
    logger.debug('my message');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('debug', 'my message');
  });

  it('Silly delegates to log.', async(): Promise<void> => {
    logger.silly('my message');
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('silly', 'my message');
  });
});
