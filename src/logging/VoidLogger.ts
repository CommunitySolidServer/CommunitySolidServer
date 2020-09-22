import type { Logger } from './Logger';
import type { LogLevel } from './LogLevel';

/**
 * A logger that does nothing on a log message.
 */
export class VoidLogger implements Logger {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public log(level: LogLevel, message: string, meta?: any): Logger {
    // Do nothing
    return this;
  }
}
