import cors from 'cors';
import express from 'express';
import { HttpHandler } from './HttpHandler';
import { Server } from 'http';

export class ExpressHttpServer {
  private readonly handler: HttpHandler;

  public constructor(handler: HttpHandler) {
    this.handler = handler;
  }

  public listen(port?: number): Server {
    const app = express();

    app.use(cors({
      // Based on https://github.com/solid/solid-spec/blob/master/recommendations-server.md#cors---cross-origin-resource-sharing
      // By default origin is always '*', this forces it to be the origin header if there is one
      origin: (origin, callback): void => callback(null, (origin || '*') as any),
      methods: [ 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE' ],
    }));

    app.use(async(request, response): Promise<void> => {
      try {
        await this.handler.handleSafe({ request, response });
      } catch (error) {
        const errMsg = `${error.name}: ${error.message}\n${error.stack}`;
        process.stderr.write(errMsg);
        response.status(500).send(errMsg);
      }
    });
    return app.listen(port);
  }
}
