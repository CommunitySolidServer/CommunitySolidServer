import type { Logger as WinstonInnerLogger } from 'winston';
import type { Logger } from './Logger';
import type { LogLevel } from './LogLevel';

/**
 * A WinstonLogger implements the {@link Logger} interface using a given winston logger.
 */
export class WinstonLogger implements Logger {
  private readonly logger: WinstonInnerLogger;

  public constructor(logger: WinstonInnerLogger) {
    this.logger = logger;
  }

  public log(level: LogLevel, message: string, meta?: any): this {
    this.logger.log(level, message, meta);
    return this;
  }
}
