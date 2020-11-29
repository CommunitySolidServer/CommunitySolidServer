import cors from 'cors';
import type { RequestHandler } from 'express';
import { HttpHandler } from '../HttpHandler';
import type { HttpRequest } from '../HttpRequest';
import type { HttpResponse } from '../HttpResponse';

/**
 * Handler that sets CORS options on the response.
 */
export class CorsHandler extends HttpHandler {
  private readonly corsHandler: RequestHandler;

  public constructor() {
    super();
    this.corsHandler = cors({
      origin: (origin, callback): void => callback(null, (origin ?? '*') as any),
      methods: [ 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE' ],
    });
  }

  public async handle(input: { request: HttpRequest; response: HttpResponse }): Promise<void> {
    return new Promise((resolve): void => {
      this.corsHandler(input.request as any, input.response as any, (): void => resolve());
    });
  }
}
