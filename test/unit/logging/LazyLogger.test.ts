import { LazyLogger } from '../../../src/logging/LazyLogger';
import { LazyLoggerFactory } from '../../../src/logging/LazyLoggerFactory';

describe('LazyLogger', (): void => {
  let lazyLoggerFactory: LazyLoggerFactory;
  let logger: LazyLogger;
  beforeEach(async(): Promise<void> => {
    lazyLoggerFactory = LazyLoggerFactory.getInstance();
    lazyLoggerFactory.setLoggerFactory(undefined);
    logger = new LazyLogger(lazyLoggerFactory, 'MyLabel');
  });

  it('throws when no logger factory is set in the lazy logger factory.', async(): Promise<void> => {
    expect((): any => logger.log('debug', 'my message', { abc: true }))
      .toThrow(new Error('Illegal logging during initialization'));
  });

  it('creates a new logger using the factory.', async(): Promise<void> => {
    const dummyLogger: any = {
      log: jest.fn((): any => dummyLogger),
    };
    const dummyLoggerFactory: any = {
      createLogger: jest.fn((): any => dummyLogger),
    };
    lazyLoggerFactory.setLoggerFactory(dummyLoggerFactory);

    expect(logger.log('debug', 'my message', { abc: true })).toBe(dummyLogger);
    expect(dummyLoggerFactory.createLogger).toHaveBeenCalledTimes(1);
    expect(dummyLoggerFactory.createLogger).toHaveBeenCalledWith('MyLabel');
    expect(dummyLogger.log).toHaveBeenCalledTimes(1);
    expect(dummyLogger.log).toHaveBeenCalledWith('debug', 'my message', { abc: true });
  });

  it('reuses the logger for repeated calls.', async(): Promise<void> => {
    const dummyLogger: any = {
      log: jest.fn((): any => dummyLogger),
    };
    const dummyLoggerFactory: any = {
      createLogger: jest.fn((): any => dummyLogger),
    };
    lazyLoggerFactory.setLoggerFactory(dummyLoggerFactory);

    expect(logger.log('debug', 'my message 1', { abc: true })).toBe(dummyLogger);
    expect(logger.log('debug', 'my message 2', { abc: true })).toBe(dummyLogger);
    expect(logger.log('debug', 'my message 3', { abc: true })).toBe(dummyLogger);
    expect(dummyLoggerFactory.createLogger).toHaveBeenCalledTimes(1);
    expect(dummyLoggerFactory.createLogger).toHaveBeenCalledWith('MyLabel');
    expect(dummyLogger.log).toHaveBeenCalledTimes(3);
    expect(dummyLogger.log).toHaveBeenNthCalledWith(1, 'debug', 'my message 1', { abc: true });
    expect(dummyLogger.log).toHaveBeenNthCalledWith(2, 'debug', 'my message 2', { abc: true });
    expect(dummyLogger.log).toHaveBeenNthCalledWith(3, 'debug', 'my message 3', { abc: true });
  });
});
