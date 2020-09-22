import type { Logger } from './Logger';
import type { LoggerFactory } from './LoggerFactory';
import { VoidLogger } from './VoidLogger';

/**
 * A factory that always returns {@link VoidLogger}, which does nothing on log messages.
 */
export class VoidLoggerFactory implements LoggerFactory {
  private readonly logger = new VoidLogger();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public createLogger(label: string): Logger {
    return this.logger;
  }
}
