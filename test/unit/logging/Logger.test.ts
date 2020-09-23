import { Logger } from '../../../src/logging/Logger';

describe('Logger', (): void => {
  let logger: Logger;
  let meta: any;
  beforeEach(async(): Promise<void> => {
    logger = new (Logger as any)();
    logger.log = jest.fn();
    meta = { abc: 123 };
  });

  it('Error delegates to log.', async(): Promise<void> => {
    logger.error('my message', meta);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('error', 'my message', meta);
  });

  it('Warn delegates to log.', async(): Promise<void> => {
    logger.warn('my message', meta);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('warn', 'my message', meta);
  });

  it('Info delegates to log.', async(): Promise<void> => {
    logger.info('my message', meta);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('info', 'my message', meta);
  });
  it('Verbose delegates to log.', async(): Promise<void> => {
    logger.verbose('my message', meta);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('verbose', 'my message', meta);
  });

  it('Debug delegates to log.', async(): Promise<void> => {
    logger.debug('my message', meta);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('debug', 'my message', meta);
  });

  it('Silly delegates to log.', async(): Promise<void> => {
    logger.silly('my message', meta);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('silly', 'my message', meta);
  });
});
