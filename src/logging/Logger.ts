import type { LogLevel } from './LogLevel';

/**
 * Logs messages on a specific level.
 *
 * @see getLoggerFor on how to instantiate loggers.
 */
export interface SimpleLogger {
  /**
   * Log the given message at the given level.
   * If the internal level is higher than the given level, the message may be voided.
   * @param level - The level to log at.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  log: (level: LogLevel, message: string) => SimpleLogger;
}

/**
 * Logs messages, with convenience methods to log on a specific level.
 *
 * @see getLoggerFor on how to instantiate loggers.
 */
export interface Logger extends SimpleLogger {
  /**
   * Log the given message at the given level.
   * If the internal level is higher than the given level, the message may be voided.
   * @param level - The level to log at.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  log: (level: LogLevel, message: string) => Logger;

  /**
   * Log a message at the 'error' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  error: (message: string) => Logger;

  /**
   * Log a message at the 'warn' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  warn: (message: string) => Logger;

  /**
   * Log a message at the 'info' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  info: (message: string) => Logger;

  /**
   * Log a message at the 'verbose' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  verbose: (message: string) => Logger;

  /**
   * Log a message at the 'debug' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  debug: (message: string) => Logger;

  /**
   * Log a message at the 'silly' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  silly: (message: string) => Logger;
}

/**
 * Base class that implements all additional {@link BaseLogger} methods,
 * leaving only the implementation of {@link SimpleLogger}.
 */
export abstract class BaseLogger implements Logger {
  public abstract log(level: LogLevel, message: string): Logger;

  public error(message: string): Logger {
    return this.log('error', message);
  }

  public warn(message: string): Logger {
    return this.log('warn', message);
  }

  public info(message: string): Logger {
    return this.log('info', message);
  }

  public verbose(message: string): Logger {
    return this.log('verbose', message);
  }

  public debug(message: string): Logger {
    return this.log('debug', message);
  }

  public silly(message: string): Logger {
    return this.log('silly', message);
  }
}

/**
 * Implements {@link BaseLogger} around a {@link SimpleLogger},
 * which can be swapped out a runtime.
 */
export class WrappingLogger extends BaseLogger {
  public logger: SimpleLogger;

  public constructor(logger: SimpleLogger) {
    super();
    this.logger = logger;
  }

  public log(level: LogLevel, message: string): this {
    this.logger.log(level, message);
    return this;
  }
}
