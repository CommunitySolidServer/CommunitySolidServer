import type { Server } from 'node:http';
import { promisify } from 'node:util';
import { getLoggerFor } from '../logging/LogUtil';
import { isHttpsServer } from '../server/HttpServerFactory';
import type { HttpServerFactory } from '../server/HttpServerFactory';
import type { Finalizable } from './final/Finalizable';
import { Initializer } from './Initializer';

/**
 * Creates and starts an HTTP server.
 */
export class ServerInitializer extends Initializer implements Finalizable {
  protected readonly logger = getLoggerFor(this);

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
    this.server = await this.serverFactory.createServer();

    if (this.socketPath) {
      this.logger.info(`Listening to server at ${this.server.address() as string}`);
      this.server.listen(this.socketPath);
    } else {
      const url = new URL(`http${isHttpsServer(this.server) ? 's' : ''}://localhost:${this.port}/`).href;
      this.logger.info(`Listening to server at ${url}`);
      this.server.listen(this.port);
    }
  }

  public async finalize(): Promise<void> {
    if (this.server) {
      return promisify(this.server.close.bind(this.server))();
    }
  }
}
