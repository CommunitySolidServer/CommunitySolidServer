import { LazyLogger } from '../../../src/logging/LazyLogger';
import { LazyLoggerFactory } from '../../../src/logging/LazyLoggerFactory';

describe('LazyLoggerFactory', (): void => {
  let dummyLogger: any;
  let dummyLoggerFactory: any;
  beforeEach(async(): Promise<void> => {
    LazyLoggerFactory.getInstance().setLoggerFactory(undefined);
    dummyLogger = {
      log: jest.fn((): any => dummyLogger),
    };
    dummyLoggerFactory = {
      createLogger: jest.fn((): any => dummyLogger),
    };
  });

  it('is a singleton.', async(): Promise<void> => {
    expect(LazyLoggerFactory.getInstance()).toBeInstanceOf(LazyLoggerFactory);
  });

  it('allows LazyLoggers to be created before an inner factory was set.', async(): Promise<void> => {
    const logger = LazyLoggerFactory.getInstance().createLogger('MyLabel');
    expect(logger).toBeInstanceOf(LazyLogger);
  });

  it('allows LazyLoggers to be created after an inner factory was set.', async(): Promise<void> => {
    LazyLoggerFactory.getInstance().setLoggerFactory(dummyLoggerFactory);
    const logger = LazyLoggerFactory.getInstance().createLogger('MyLabel');
    expect(logger).toBeInstanceOf(LazyLogger);
  });

  it('throws when retrieving the inner factory if none has been set.', async(): Promise<void> => {
    expect((): any => LazyLoggerFactory.getInstance().getLoggerFactoryOrThrow())
      .toThrow(new Error('Illegal logging during initialization'));
  });

  it('Returns the inner factory if one has been set.', async(): Promise<void> => {
    LazyLoggerFactory.getInstance().setLoggerFactory(dummyLoggerFactory);
    expect(LazyLoggerFactory.getInstance().getLoggerFactoryOrThrow()).toBe(dummyLoggerFactory);
  });

  it('allows LazyLoggers to be invoked if a factory has been set beforehand.', async(): Promise<void> => {
    LazyLoggerFactory.getInstance().setLoggerFactory(dummyLoggerFactory);
    const logger = LazyLoggerFactory.getInstance().createLogger('MyLabel');
    logger.log('debug', 'my message', { abc: true });

    expect(dummyLogger.log).toHaveBeenCalledTimes(1);
    expect(dummyLogger.log).toHaveBeenCalledWith('debug', 'my message', { abc: true });
  });

  it('allows LazyLoggers to be invoked if a factory has been after lazy logger creation.', async(): Promise<void> => {
    const logger = LazyLoggerFactory.getInstance().createLogger('MyLabel');
    LazyLoggerFactory.getInstance().setLoggerFactory(dummyLoggerFactory);
    logger.log('debug', 'my message', { abc: true });

    expect(dummyLogger.log).toHaveBeenCalledTimes(1);
    expect(dummyLogger.log).toHaveBeenCalledWith('debug', 'my message', { abc: true });
  });

  it('errors on invoking LazyLoggers if a factory has not been set yet.', async(): Promise<void> => {
    const logger = LazyLoggerFactory.getInstance().createLogger('MyLabel');
    expect((): any => logger.log('debug', 'my message', { abc: true }))
      .toThrow(new Error('Illegal logging during initialization'));
  });
});
