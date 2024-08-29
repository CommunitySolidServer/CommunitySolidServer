import type { LoggerFactory } from 'global-logger-factory';
import { setGlobalLoggerFactory } from 'global-logger-factory';
import { Initializer } from './Initializer';

/**
 * Sets up the global logger factory.
 */
export class LoggerInitializer extends Initializer {
  private readonly loggerFactory: LoggerFactory;

  public constructor(loggerFactory: LoggerFactory) {
    super();
    this.loggerFactory = loggerFactory;
  }

  public async handle(): Promise<void> {
    setGlobalLoggerFactory(this.loggerFactory);
  }
}
