import type { Server } from 'http';
import { URL } from 'url';
import { promisify } from 'util';
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
  private readonly port: number;

  private server?: Server;

  public constructor(serverFactory: HttpServerFactory, port: number) {
    super();
    this.serverFactory = serverFactory;
    this.port = port;
  }

  public async handle(): Promise<void> {
    this.server = await this.serverFactory.createServer();

    const url = new URL(`http${isHttpsServer(this.server) ? 's' : ''}://localhost:${this.port}/`).href;
    this.logger.info(`Listening to server at ${url}`);
    this.server.listen(this.port);
  }

  public async finalize(): Promise<void> {
    if (this.server) {
      return promisify(this.server.close.bind(this.server))();
    }
  }
}
