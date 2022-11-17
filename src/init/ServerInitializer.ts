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
  private readonly port?: number;
  private readonly socketPath?: string;

  private server?: Server;

  public constructor(serverFactory: HttpServerFactory, port?: number, socketPath?: string) {
    super();
    this.serverFactory = serverFactory;
    this.port = port;
    this.socketPath = socketPath;
    if (!port && !socketPath) {
      throw new Error('Either Port or Socket arguments must be set');
    }
  }

  public async handle(): Promise<void> {
    if (this.socketPath) {
      this.server = this.serverFactory.startServer(this.socketPath);
    } else if (this.port) {
      this.server = this.serverFactory.startServer(this.port);
    }
  }

  public async finalize(): Promise<void> {
    if (this.server) {
      return promisify(this.server.close.bind(this.server))();
    }
  }
}
