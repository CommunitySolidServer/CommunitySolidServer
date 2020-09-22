import type { LazyLoggerFactory } from './LazyLoggerFactory';
import type { Logger } from './Logger';
import type { LogLevel } from './LogLevel';

/**
 * Creates a logger lazily using a reference to {@link LazyLoggerFactory}.
 *
 * An error will be thrown if {@link LazyLogger.log} is invoked
 * before a {@link LoggerFactory} is set in {@link LazyLoggerFactory}.
 */
export class LazyLogger implements Logger {
  private readonly lazyLoggerFactory: LazyLoggerFactory;
  private readonly label: string;

  private logger: Logger | undefined;

  public constructor(lazyLoggerFactory: LazyLoggerFactory, label: string) {
    this.lazyLoggerFactory = lazyLoggerFactory;
    this.label = label;
  }

  public log(level: LogLevel, message: string, meta: any): Logger {
    if (!this.logger) {
      this.logger = this.lazyLoggerFactory.getLoggerFactoryOrThrow()
        .createLogger(this.label);
    }
    return this.logger.log(level, message, meta);
  }
}
