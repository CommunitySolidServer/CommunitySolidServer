import type { LoggerFactory } from 'global-logger-factory';
import { setGlobalLoggerFactory } from 'global-logger-factory';
import { LoggerInitializer } from '../../../src/init/LoggerInitializer';

jest.mock('global-logger-factory');

describe('LoggerInitializer', (): void => {
  const loggerFactory = {} as LoggerFactory;

  let initializer: LoggerInitializer;
  beforeAll(async(): Promise<void> => {
    initializer = new LoggerInitializer(loggerFactory);
  });

  it('sets the global logger factory.', async(): Promise<void> => {
    await initializer.handle();
    expect(setGlobalLoggerFactory).toHaveBeenCalledTimes(1);
    expect(setGlobalLoggerFactory).toHaveBeenCalledWith(loggerFactory);
  });
});
