import { PassThrough } from 'stream';
import type { Logger } from 'winston';
import { WinstonLogger } from '../../../src/logging/WinstonLogger';
import { WinstonLoggerFactory } from '../../../src/logging/WinstonLoggerFactory';

describe('WinstonLoggerFactory', (): void => {
  let factory: WinstonLoggerFactory;
  beforeEach(async(): Promise<void> => {
    factory = new WinstonLoggerFactory('debug');
  });

  it('creates WinstonLoggers.', async(): Promise<void> => {
    const logger = factory.createLogger('MyLabel');
    expect(logger).toBeInstanceOf(WinstonLogger);
    const innerLogger: Logger = (logger as any).logger;
    expect(innerLogger.level).toBe('debug');
    expect(innerLogger.format).toBeTruthy();
    expect(innerLogger.transports).toHaveLength(1);
  });

  it('allows WinstonLoggers to be invoked.', async(): Promise<void> => {
    // Create a dummy log transport
    const transport: any = new PassThrough({ objectMode: true });
    transport.write = jest.fn();
    transport.log = jest.fn();
    (factory as any).createTransports = (): any => [ transport ];

    // Create logger, and log
    const logger = factory.createLogger('MyLabel');
    logger.log('debug', 'my message');

    expect(transport.write).toHaveBeenCalledTimes(1);
    expect(transport.write).toHaveBeenCalledWith({
      label: 'MyLabel',
      level: expect.stringContaining('debug'),
      message: 'my message',
      timestamp: expect.any(String),
      metadata: expect.any(Object),
      [Symbol.for('level')]: 'debug',
      [Symbol.for('splat')]: [ undefined ],
      [Symbol.for('message')]: expect.any(String),
    });
  });
});
