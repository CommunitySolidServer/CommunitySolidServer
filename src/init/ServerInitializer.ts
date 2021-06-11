import type { Server } from 'http';
import { promisify } from 'util';
import type { HttpServerFactory } from '../server/HttpServerFactory';
import type { Finalizable } from './final/Finalizable';
import { Initializer } from './Initializer';

/**
 * Creates and starts an HTTP server.
 */
export class ServerInitializer extends Initializer implements Finalizable {
  private readonly serverFactory: HttpServerFactory;
  private readonly port: number;

  private server?: Server;

  public constructor(serverFactory: HttpServerFactory, port: number) {
    super();
    this.serverFactory = serverFactory;
    this.port = port;
  }

  public async handle(): Promise<void> {
    this.server = this.serverFactory.startServer(this.port);
  }

  public async finalize(): Promise<void> {
    if (this.server) {
      return promisify(this.server.close.bind(this.server))();
    }
  }
}
