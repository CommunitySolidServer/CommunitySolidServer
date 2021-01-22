import type { Server } from 'http';
import type { Express } from 'express';
import express from 'express';
import { getLoggerFor } from '../logging/LogUtil';
import { isNativeError } from '../util/errors/ErrorUtil';
import { guardStream } from '../util/GuardedStream';
import type { HttpHandler } from './HttpHandler';
import type { HttpServerFactory } from './HttpServerFactory';

export class ExpressHttpServerFactory implements HttpServerFactory {
  protected readonly logger = getLoggerFor(this);

  private readonly handler: HttpHandler;

  public constructor(handler: HttpHandler) {
    this.handler = handler;
  }

  public startServer(port: number): Server {
    this.logger.info(`Starting server at http://localhost:${port}/`);
    return this.createApp().listen(port);
  }

  protected createApp(): Express {
    return express().use(async(request, response, done): Promise<void> => {
      try {
        this.logger.info(`Received request for ${request.url}`);
        await this.handler.handleSafe({ request: guardStream(request), response });
      } catch (error: unknown) {
        const errMsg = isNativeError(error) ? `${error.name}: ${error.message}\n${error.stack}` : 'Unknown error.';
        this.logger.error(errMsg);
        if (response.headersSent) {
          response.end();
        } else {
          response.status(500).contentType('text/plain').send(errMsg);
        }
      } finally {
        done();
      }
    });
  }
}
