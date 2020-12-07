import type { HttpServerFactory } from '../server/HttpServerFactory';
import { Initializer } from './Initializer';

/**
 * Creates and starts an HTTP server.
 */
export class ServerInitializer extends Initializer {
  private readonly serverFactory: HttpServerFactory;
  private readonly port: number;

  public constructor(serverFactory: HttpServerFactory, port: number) {
    super();
    this.serverFactory = serverFactory;
    this.port = port;
  }

  public async handle(): Promise<void> {
    this.serverFactory.startServer(this.port);
  }
}
