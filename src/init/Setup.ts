import type { HttpServerFactory } from '../server/HttpServerFactory';
import type { Initializer } from './Initializer';

/**
 * Invokes all logic to setup a server.
 */
export class Setup {
  private readonly serverFactory: HttpServerFactory;
  private readonly initializer: Initializer;
  private readonly base: string;
  private readonly port: number;

  public constructor(
    initializer: Initializer,
    serverFactory: HttpServerFactory,
    base: string,
    port: number,
  ) {
    this.initializer = initializer;
    this.serverFactory = serverFactory;
    this.base = base;
    this.port = port;
  }

  /**
   * Set up a server.
   */
  public async setup(): Promise<string> {
    await this.initializer.handleSafe();
    this.serverFactory.startServer(this.port);
    return this.base;
  }
}
