import type { LoggerFactory } from '../logging/LoggerFactory';
import { getLoggerFor, setGlobalLoggerFactory } from '../logging/LogUtil';
import type { HttpServerFactory } from '../server/HttpServerFactory';
import type { Initializer } from './Initializer';

/**
 * Invokes all logic to setup a server.
 */
export class Setup {
  protected readonly logger = getLoggerFor(this);
  private readonly serverFactory: HttpServerFactory;
  private readonly loggerFactory: LoggerFactory;
  private readonly initializer: Initializer;
  private readonly base: string;
  private readonly port: number;

  public constructor(
    serverFactory: HttpServerFactory,
    loggerFactory: LoggerFactory,
    initializer: Initializer,
    base: string,
    port: number,
  ) {
    this.serverFactory = serverFactory;
    this.loggerFactory = loggerFactory;
    this.initializer = initializer;
    this.base = base;
    this.port = port;
  }

  /**
   * Set up a server.
   */
  public async setup(): Promise<string> {
    setGlobalLoggerFactory(this.loggerFactory);

    await this.initializer.handleSafe();

    this.serverFactory.startServer(this.port);
    return this.base;
  }
}
