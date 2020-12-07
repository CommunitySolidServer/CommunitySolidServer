import { LoggerInitializer } from '../../../src/init/LoggerInitializer';
import type { LoggerFactory } from '../../../src/logging/LoggerFactory';
import { setGlobalLoggerFactory } from '../../../src/logging/LogUtil';

jest.mock('../../../src/logging/LogUtil');

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
