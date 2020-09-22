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

  private loggerFactory: LoggerFactory | undefined;

  private constructor() {
    // Singleton instance
  }

  public static getInstance(): LazyLoggerFactory {
    return LazyLoggerFactory.instance;
  }

  public createLogger(label: string): Logger {
    return new LazyLogger(this, label);
  }

  public setLoggerFactory(loggerFactory: LoggerFactory | undefined): void {
    this.loggerFactory = loggerFactory;
  }

  public getLoggerFactoryOrThrow(): LoggerFactory {
    if (!this.loggerFactory) {
      throw new Error('Illegal logging during initialization');
    }
    return this.loggerFactory;
  }
}
