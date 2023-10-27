import { BaseLogger } from './Logger';

/**
 * A logger that does nothing on a log message.
 */
export class VoidLogger extends BaseLogger {
  public log(): this {
    // Do nothing
    return this;
  }
}
