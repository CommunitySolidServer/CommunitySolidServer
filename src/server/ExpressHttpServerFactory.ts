import type { Server } from 'http';
import type { Express } from 'express';
import express from 'express';
import { getLoggerFor } from '../logging/LogUtil';
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
    return this.createApp().listen(port);
  }

  protected createApp(): Express {
    return express().use(async(request, response, done): Promise<void> => {
      try {
        this.logger.info(`Received request for ${request.url}`);
        await this.handler.handleSafe({ request: guardStream(request), response });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : 'Unknown error.';
        this.logger.error(errMsg);
        response.status(500).contentType('text/plain').send(errMsg);
      } finally {
        done();
      }
    });
  }
}
