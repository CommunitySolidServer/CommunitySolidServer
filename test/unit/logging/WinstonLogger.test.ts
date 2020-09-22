import { WinstonLogger } from '../../../src/logging/WinstonLogger';

describe('WinstonLogger', (): void => {
  let innerLogger: any;
  let logger: WinstonLogger;
  beforeEach(async(): Promise<void> => {
    innerLogger = {
      log: jest.fn(),
    };
    logger = new WinstonLogger(innerLogger);
  });

  it('delegates log invocations to the inner logger.', async(): Promise<void> => {
    expect(logger.log('debug', 'my message', { abc: true })).toBe(logger);
    expect(innerLogger.log).toHaveBeenCalledTimes(1);
    expect(innerLogger.log).toHaveBeenCalledWith('debug', 'my message', { abc: true });
  });
});
