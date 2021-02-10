import type { Server, IncomingMessage, ServerResponse } from 'http';
import { createServer } from 'http';
import { getLoggerFor } from '../logging/LogUtil';
import { isNativeError } from '../util/errors/ErrorUtil';
import { guardStream } from '../util/GuardedStream';
import type { HttpHandler } from './HttpHandler';
import type { HttpServerFactory } from './HttpServerFactory';

export class BaseHttpServerFactory implements HttpServerFactory {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: HttpHandler;

  public constructor(handler: HttpHandler) {
    this.handler = handler;
  }

  public startServer(port: number): Server {
    this.logger.info(`Starting server at http://localhost:${port}/`);
    return this.createApp().listen(port);
  }

  protected createApp(): Server {
    return createServer(
      async(request: IncomingMessage, response: ServerResponse): Promise<void> => {
        try {
          this.logger.info(`Received request for ${request.url}`);
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
      },
    );
  }
}
