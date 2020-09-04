import { Server } from 'http';
import cors from 'cors';
import express, { Express } from 'express';
import { HttpHandler } from './HttpHandler';

export class ExpressHttpServer {
  private readonly handler: HttpHandler;

  public constructor(handler: HttpHandler) {
    this.handler = handler;
  }

  public listen(port?: number): Server {
    const app = express();
    this.setup(app);
    return app.listen(port);
  }

  protected setup(app: Express): void {
    // Set up server identification
    app.use((request, response, done): void => {
      response.setHeader('X-Powered-By', 'Community Solid Server');
      done();
    });

    // Set up Cross-Origin Resource Sharing (CORS)
    app.use(cors({
      // Based on https://github.com/solid/solid-spec/blob/master/recommendations-server.md#cors---cross-origin-resource-sharing
      // By default origin is always '*', this forces it to be the origin header if there is one
      origin: (origin, callback): void => callback(null, (origin ?? '*') as any),
      methods: [ 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE' ],
    }));

    // Delegate to the main handler
    app.use(async(request, response, done): Promise<void> => {
      try {
        await this.handler.handleSafe({ request, response });
      } catch (error) {
        const errMsg = `${error.name}: ${error.message}\n${error.stack}`;
        process.stderr.write(errMsg);
        response.status(500).contentType('text/plain').send(errMsg);
      } finally {
        done();
      }
    });
  }
}
