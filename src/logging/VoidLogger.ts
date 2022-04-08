import { BaseLogger } from './Logger';
import type { LogLevel } from './LogLevel';

/**
 * A logger that does nothing on a log message.
 */
export class VoidLogger extends BaseLogger {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public log(level: LogLevel, message: string, meta?: any): this {
    // Do nothing
    return this;
  }
}
