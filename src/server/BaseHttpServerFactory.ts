import { readFileSync } from 'fs';
import type { Server, IncomingMessage, ServerResponse } from 'http';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { URL } from 'url';
import { getLoggerFor } from '../logging/LogUtil';
import { isError } from '../util/errors/ErrorUtil';
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

  /**
   * If the error stack traces should be shown in case the HttpHandler throws one.
   */
  showStackTrace?: boolean;

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
   * @param portOrSocket - Port or Unix Domain Socket on which the server listens
   */
  public startServer(port: number): Server;
  public startServer(socket: string): Server;
  public startServer(portOrSocket: number | string): Server {
    const protocol = this.options.https ? 'https' : 'http';

    const createServer = this.options.https ? createHttpsServer : createHttpServer;
    const options = this.createServerOptions();

    const server = createServer(options,
      async(request: IncomingMessage, response: ServerResponse): Promise<void> => {
        try {
          this.logger.info(`Received ${request.method} request for ${request.url}`);
          const guardedRequest = guardStream(request);
          guardedRequest.on('error', (error): void => {
            this.logger.error(`Request error: ${error.message}`);
          });
          await this.handler.handleSafe({ request: guardedRequest, response });
        } catch (error: unknown) {
          let errMsg: string;
          if (!isError(error)) {
            errMsg = `Unknown error: ${error}.\n`;
          } else if (this.options.showStackTrace && error.stack) {
            errMsg = `${error.stack}\n`;
          } else {
            errMsg = `${error.name}: ${error.message}\n`;
          }
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

    if (typeof portOrSocket === 'string') {
      if (process.platform === 'win32') {
        throw new Error('Windows does not support Unix Domain Sockets');
      }
      const result = server.listen(portOrSocket);
      this.logger.info(`Listening to server at ${server.address()}`);
      return result;
    }
    const url = new URL(`${protocol}://localhost:${portOrSocket}/`).href;
    this.logger.info(`Listening to server at ${url}`);
    return server.listen(portOrSocket);
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
