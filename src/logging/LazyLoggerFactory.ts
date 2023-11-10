import cluster from 'node:cluster';
import { WrappingLogger } from './Logger';
import type { Logger } from './Logger';
import type { LoggerFactory } from './LoggerFactory';
import type { LogLevel } from './LogLevel';

/**
 * Temporary {@link LoggerFactory} that buffers log messages in memory
 * until the {@link TemporaryLoggerFactory#switch} method is called.
 */
class TemporaryLoggerFactory implements LoggerFactory {
  private bufferSpaces: number;
  private readonly wrappers: { wrapper: WrappingLogger; label: string }[] = [];
  private readonly buffer: { logger: Logger; level: LogLevel; message: string }[] = [];

  public constructor(bufferSize = 1024) {
    this.bufferSpaces = bufferSize;
  }

  public createLogger(label: string): WrappingLogger {
    const wrapper = new WrappingLogger({
      log: (level: LogLevel, message: string): Logger =>
        this.bufferLogEntry(wrapper, level, message),
    });
    this.wrappers.push({ wrapper, label });
    return wrapper;
  }

  private bufferLogEntry(logger: WrappingLogger, level: LogLevel, message: string): Logger {
    // Buffer the message if spaces are still available
    if (this.bufferSpaces > 0) {
      this.bufferSpaces -= 1;
      // If this is the last space, instead generate a warning through a new logger
      if (this.bufferSpaces === 0) {
        logger = this.createLogger('LazyLoggerFactory');
        level = 'warn';
        message = `Memory-buffered logging limit of ${this.buffer.length + 1} reached`;
      }
      this.buffer.push({ logger, level, message });
    }
    return logger;
  }

  /**
   * Swaps all lazy loggers to new loggers from the given factory,
   * and emits any buffered messages through those actual loggers.
   */
  public switch(loggerFactory: LoggerFactory): void {
    // Instantiate an actual logger within every lazy logger
    for (const { wrapper, label } of this.wrappers.splice(0, this.wrappers.length)) {
      wrapper.logger = loggerFactory.createLogger(label);
    }
    // Emit all buffered log messages
    for (const { logger, level, message } of this.buffer.splice(0, this.buffer.length)) {
      logger.log(level, message, { isPrimary: cluster.isMaster, pid: process.pid });
    }
  }
}

/**
 * Wraps around another {@link LoggerFactory} that can be set lazily.
 * This is useful when objects are instantiated (and when they create loggers)
 * before the logging system has been fully instantiated,
 * as is the case when using a dependency injection framework such as Components.js.
 *
 * Loggers can be created even before a {@link LoggerFactory} is set;
 * any log messages will be buffered and re-emitted.
 */
export class LazyLoggerFactory implements LoggerFactory {
  private factory: LoggerFactory;

  public constructor(options: { bufferSize?: number } = {}) {
    this.factory = new TemporaryLoggerFactory(options.bufferSize);
  }

  public get loggerFactory(): LoggerFactory {
    if (this.factory instanceof TemporaryLoggerFactory) {
      throw new TypeError('Logger factory not yet set.');
    }
    return this.factory;
  }

  public set loggerFactory(loggerFactory: LoggerFactory) {
    if (this.factory instanceof TemporaryLoggerFactory) {
      this.factory.switch(loggerFactory);
    }
    this.factory = loggerFactory;
  }

  public createLogger(label: string): Logger {
    return this.factory.createLogger(label);
  }
}
