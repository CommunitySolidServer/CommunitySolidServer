import type { Logger as WinstonInnerLogger } from 'winston';
import { WinstonLogger } from '../../../src/logging/WinstonLogger';

describe('A WinstonLogger', (): void => {
  let innerLogger: jest.Mocked<WinstonInnerLogger>;
  let logger: WinstonLogger;

  beforeEach(async(): Promise<void> => {
    innerLogger = {
      isLevelEnabled: jest.fn().mockReturnValue(true),
      log: jest.fn(),
    } as unknown as jest.Mocked<WinstonInnerLogger>;
    logger = new WinstonLogger(innerLogger);
  });

  it('delegates log invocations to the inner logger when the level is enabled.', async(): Promise<void> => {
    expect(logger.log('debug', 'my message', { abc: true })).toBe(logger);
    expect(innerLogger.isLevelEnabled).toHaveBeenCalledTimes(1);
    expect(innerLogger.isLevelEnabled).toHaveBeenCalledWith('debug');
    expect(innerLogger.log).toHaveBeenCalledTimes(1);
    expect(innerLogger.log).toHaveBeenCalledWith('debug', 'my message', { abc: true });
  });

  it('skips the inner logger when the level is not enabled.', async(): Promise<void> => {
    innerLogger.isLevelEnabled.mockReturnValue(false);
    expect(logger.log('debug', 'my message', { abc: true })).toBe(logger);
    expect(innerLogger.isLevelEnabled).toHaveBeenCalledTimes(1);
    expect(innerLogger.isLevelEnabled).toHaveBeenCalledWith('debug');
    expect(innerLogger.log).toHaveBeenCalledTimes(0);
  });

  it('delegates when the inner logger has no level check.', async(): Promise<void> => {
    const log = jest.fn();
    logger = new WinstonLogger({ log } as unknown as WinstonInnerLogger);
    expect(logger.log('debug', 'my message', { abc: true })).toBe(logger);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('debug', 'my message', { abc: true });
  });
});
