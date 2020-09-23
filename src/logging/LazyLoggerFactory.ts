import { LazyLogger } from './LazyLogger';
import type { Logger } from './Logger';
import type { LoggerFactory } from './LoggerFactory';

/**
 * Wraps over another {@link LoggerFactory} that can be set lazily.
 * This is a singleton class, for which the instance can be retrieved using {@link LazyLoggerFactory.getInstance}.
 *
 * Loggers can safely be created before a {@link LoggerFactory} is set.
 * But an error will be thrown if {@link Logger.log} is invoked before a {@link LoggerFactory} is set.
 *
 * This creates instances of {@link LazyLogger}.
 */
export class LazyLoggerFactory implements LoggerFactory {
  private static readonly instance = new LazyLoggerFactory();

  private ploggerFactory: LoggerFactory | undefined;

  private constructor() {
    // Singleton instance
  }

  public static getInstance(): LazyLoggerFactory {
    return LazyLoggerFactory.instance;
  }

  public createLogger(label: string): Logger {
    return new LazyLogger(this, label);
  }

  public resetLoggerFactory(): void {
    this.ploggerFactory = undefined;
  }

  public get loggerFactory(): LoggerFactory {
    if (!this.ploggerFactory) {
      throw new Error('No logger factory has been set yet. Can be caused logger invocation during initialization.');
    }
    return this.ploggerFactory;
  }

  public set loggerFactory(loggerFactory: LoggerFactory) {
    this.ploggerFactory = loggerFactory;
  }
}
