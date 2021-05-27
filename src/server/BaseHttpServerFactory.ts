import { readFileSync } from 'fs';
import type { Server, IncomingMessage, ServerResponse } from 'http';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { URL } from 'url';
import { getLoggerFor } from '../logging/LogUtil';
import { isNativeError } from '../util/errors/ErrorUtil';
import { guardStream } from '../util/GuardedStream';
import type { HttpHandler } from './HttpHandler';
import type { HttpServerFactory } from './HttpServerFactory';

/**
 * Options to be used when creating the server.
 * Due to Components.js not supporting external types, this has been simplified (for now?).
 * The common https keys here (key/cert/pfx) will be interpreted as file paths that need to be read
 * before passing the options to the `createServer` function.
 */
export interface BaseHttpServerOptions {
  /**
   * If the server should start as an http or https server.
   */
  https?: boolean;

  key?: string;
  cert?: string;

  pfx?: string;
  passphrase?: string;
}

/**
 * HttpServerFactory based on the native Node.js http module
 */
export class BaseHttpServerFactory implements HttpServerFactory {
  protected readonly logger = getLoggerFor(this);

  /** The main HttpHandler */
  private readonly handler: HttpHandler;
  private readonly options: BaseHttpServerOptions;

  public constructor(handler: HttpHandler, options: BaseHttpServerOptions = { https: false }) {
    this.handler = handler;
    this.options = { ...options };
  }

  /**
   * Creates and starts an HTTP(S) server
   * @param port - Port on which the server listens
   */
  public startServer(port: number): Server {
    const protocol = this.options.https ? 'https' : 'http';
    const url = new URL(`${protocol}://localhost:${port}/`).href;
    this.logger.info(`Starting server at ${url}`);

    const createServer = this.options.https ? createHttpsServer : createHttpServer;
    const options = this.createServerOptions();

    const server = createServer(options,
      async(request: IncomingMessage, response: ServerResponse): Promise<void> => {
        try {
          this.logger.info(`Received ${request.method} request for ${request.url}`);
          await this.handler.handleSafe({ request: guardStream(request), response });
        } catch (error: unknown) {
          const errMsg = isNativeError(error) ? `${error.name}: ${error.message}\n${error.stack}` : 'Unknown error.';
          this.logger.error(errMsg);
          if (response.headersSent) {
            response.end();
          } else {
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.writeHead(500).end(errMsg);
          }
        } finally {
          if (!response.headersSent) {
            response.writeHead(404).end();
          }
        }
      });

    return server.listen(port);
  }

  private createServerOptions(): BaseHttpServerOptions {
    const options = { ...this.options };
    for (const id of [ 'key', 'cert', 'pfx' ] as const) {
      const val = options[id];
      if (val) {
        options[id] = readFileSync(val, 'utf8');
      }
    }
    return options;
  }
}
