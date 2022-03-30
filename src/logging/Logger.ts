import type { LogLevel } from './LogLevel';

/**
 * Logs messages on a specific level.
 *
 * @see getLoggerFor on how to instantiate loggers.
 */
export type BasicLogger = {
  /**
   * Log the given message at the given level.
   * If the internal level is higher than the given level, the message may be voided.
   * @param level - The level to log at.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  log: (level: LogLevel, message: string) => BasicLogger;
};

/**
 * Logs messages, with convenience methods to log on a specific level.
 *
 * @see getLoggerFor on how to instantiate loggers.
 */
export abstract class Logger implements BasicLogger {
  /**
   * Log the given message at the given level.
   * If the internal level is higher than the given level, the message may be voided.
   * @param level - The level to log at.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public abstract log(level: LogLevel, message: string): Logger;

  /**
   * Log a message at the 'error' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public error(message: string): Logger {
    return this.log('error', message);
  }

  /**
   * Log a message at the 'warn' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public warn(message: string): Logger {
    return this.log('warn', message);
  }

  /**
   * Log a message at the 'info' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public info(message: string): Logger {
    return this.log('info', message);
  }

  /**
   * Log a message at the 'verbose' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public verbose(message: string): Logger {
    return this.log('verbose', message);
  }

  /**
   * Log a message at the 'debug' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public debug(message: string): Logger {
    return this.log('debug', message);
  }

  /**
   * Log a message at the 'silly' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public silly(message: string): Logger {
    return this.log('silly', message);
  }
}
