import type { Logger as WinstonInnerLogger } from 'winston';
import { BaseLogger } from './Logger';
import type { LogLevel } from './LogLevel';

/**
 * A WinstonLogger implements the {@link Logger} interface using a given winston logger.
 */
export class WinstonLogger extends BaseLogger {
  private readonly logger: WinstonInnerLogger;

  public constructor(logger: WinstonInnerLogger) {
    super();
    this.logger = logger;
  }

  public log(level: LogLevel, message: string, meta?: unknown): this {
    // Winston applies the logger-wide format before transports filter by level.
    // Skip that pipeline for entries that no transport would emit.
    if (this.logger.isLevelEnabled?.(level) ?? true) {
      this.logger.log(level, message, meta);
    }
    return this;
  }
}
