import type { LogLevel } from './LogLevel';

/**
 * Logs messages on a certain level.
 *
 * @see getLoggerFor on how to instantiate loggers.
 */
export abstract class Logger {
  /**
   * Log the given message at the given level.
   * If the internal level is higher than the given level, the message may be voided.
   * @param level - The level to log at.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public abstract log(level: LogLevel, message: string, meta?: any): Logger;

  /**
   * Log a message at the 'error' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public error(message: string, meta?: any): Logger {
    return this.log('error', message, meta);
  }

  /**
   * Log a message at the 'warn' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public warn(message: string, meta?: any): Logger {
    return this.log('warn', message, meta);
  }

  /**
   * Log a message at the 'info' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public info(message: string, meta?: any): Logger {
    return this.log('info', message, meta);
  }

  /**
   * Log a message at the 'verbose' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public verbose(message: string, meta?: any): Logger {
    return this.log('verbose', message, meta);
  }

  /**
   * Log a message at the 'debug' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public debug(message: string, meta?: any): Logger {
    return this.log('debug', message, meta);
  }

  /**
   * Log a message at the 'silly' level.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  public silly(message: string, meta?: any): Logger {
    return this.log('silly', message, meta);
  }
}
