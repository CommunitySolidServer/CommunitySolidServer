import type { LoggerFactory } from '../logging/LoggerFactory';
import { setGlobalLoggerFactory } from '../logging/LogUtil';
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
