import type { LogLevel } from './LogLevel';

/**
 * Logs messages on a certain level.
 *
 * @see getLoggerFor on how to instantiate loggers.
 */
export interface Logger {
  /**
   * Log the given message at the given level.
   * If the internal level is higher than the given level, the message may be voided.
   * @param level - The level to log at.
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log message.
   */
  log: (level: LogLevel, message: string, meta?: any) => Logger;
}
