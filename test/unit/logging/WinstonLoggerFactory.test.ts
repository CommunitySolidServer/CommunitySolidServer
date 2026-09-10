import { PassThrough } from 'node:stream';
import type { TransformableInfo } from 'logform';
import type { Logger } from 'winston';
import { format } from 'winston';
import type * as Transport from 'winston-transport';
import { WinstonLogger } from '../../../src/logging/WinstonLogger';
import { WinstonLoggerFactory } from '../../../src/logging/WinstonLoggerFactory';

const now = new Date();
jest.useFakeTimers();
jest.setSystemTime(now);

describe('WinstonLoggerFactory', (): void => {
  let factory: WinstonLoggerFactory;
  let transport: jest.Mocked<Transport>;

  beforeEach(async(): Promise<void> => {
    factory = new WinstonLoggerFactory('debug');

    // Create a dummy log transport
    transport = new PassThrough({ objectMode: true }) as any;
    jest.spyOn(transport, 'write').mockImplementation();
    // eslint-disable-next-line jest/prefer-spy-on
    transport.log = jest.fn();
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
    (factory as any).createTransports = (): any => [ transport ];

    // Create logger, and log
    const logger = factory.createLogger('MyLabel');
    logger.log('debug', 'my message');

    expect(transport.write).toHaveBeenCalledTimes(1);
    // Need to check level like this as it has color tags
    const { level } = transport.write.mock.calls[0][0];
    expect(transport.write).toHaveBeenCalledWith({
      label: 'MyLabel',
      level,
      message: 'my message',
      timestamp: now.toISOString(),
      metadata: {},
      [Symbol.for('level')]: 'debug',
      [Symbol.for('splat')]: [ undefined ],
      [Symbol.for('message')]: `${now.toISOString()} [MyLabel] {W-???} ${level}: my message`,
    });
  });

  it('allows extra metadata when logging to indicate the thread.', async(): Promise<void> => {
    (factory as any).createTransports = (): any => [ transport ];

    // Create logger, and log
    const logger = factory.createLogger('MyLabel');
    logger.log('debug', 'my message', { isPrimary: true, pid: 0 });

    expect(transport.write).toHaveBeenCalledTimes(1);
    // Need to check level like this as it has color tags
    const { level } = transport.write.mock.calls[0][0];
    expect(transport.write).toHaveBeenCalledWith(expect.objectContaining({
      label: 'MyLabel',
      level,
      message: 'my message',
      timestamp: now.toISOString(),
      metadata: { isPrimary: true, pid: 0 },
      [Symbol.for('level')]: 'debug',
      [Symbol.for('splat')]: [{ isPrimary: true, pid: 0 }],
      [Symbol.for('message')]: `${now.toISOString()} [MyLabel] {Primary} ${level}: my message`,
    }));
  });

  it.each([
    { target: 'inner', formatCalls: 2 },
    { target: 'wrapped', formatCalls: 1 },
  ] as const)('runs CSS formatting $formatCalls times through the $target logger.', ({ target, formatCalls }): void => {
    const wrapped = new WinstonLoggerFactory('info').createLogger('MyLabel');
    const inner: Logger = (wrapped as any).logger;
    const consoleTransport = inner.transports[0];
    const loggerFormat = jest.spyOn(inner.format, 'transform');
    // Keep Winston's real transport level filtering and observe its separate formatting stage.
    consoleTransport.format = format((info): TransformableInfo => info)();
    const transportFormat = jest.spyOn(consoleTransport.format, 'transform');
    const output = jest.spyOn(consoleTransport, 'log').mockImplementation((info, callback): void => callback());

    try {
      const loggers = { inner, wrapped };
      loggers[target].log('debug', 'filtered message', { isPrimary: true, pid: 0 });
      loggers[target].log('info', 'visible message', { isPrimary: true, pid: 0 });

      expect(loggerFormat).toHaveBeenCalledTimes(formatCalls);
      expect(transportFormat).toHaveBeenCalledTimes(1);
      expect(output).toHaveBeenCalledTimes(1);
      expect(output).toHaveBeenCalledWith(expect.objectContaining({
        label: 'MyLabel',
        message: 'visible message',
        timestamp: now.toISOString(),
        metadata: { isPrimary: true, pid: 0 },
        [Symbol.for('level')]: 'info',
        [Symbol.for('message')]: expect.stringContaining('[MyLabel] {Primary}'),
      }), expect.any(Function));
    } finally {
      inner.close();
    }
  });

  it('formats messages enabled by a transport that overrides the logger level.', (): void => {
    const wrapped = new WinstonLoggerFactory('info').createLogger('MyLabel');
    const inner: Logger = (wrapped as any).logger;
    const consoleTransport = inner.transports[0];
    consoleTransport.level = 'debug';
    const loggerFormat = jest.spyOn(inner.format, 'transform');
    const output = jest.spyOn(consoleTransport, 'log').mockImplementation((info, callback): void => callback());

    try {
      wrapped.log('debug', 'visible message');

      expect(loggerFormat).toHaveBeenCalledTimes(1);
      expect(output).toHaveBeenCalledTimes(1);
      expect(output).toHaveBeenCalledWith(expect.objectContaining({
        message: 'visible message',
        [Symbol.for('level')]: 'debug',
      }), expect.any(Function));
    } finally {
      inner.close();
    }
  });
});
