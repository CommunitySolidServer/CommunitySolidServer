import { HttpHandler } from '../HttpHandler';
import type { HttpResponse } from '../HttpResponse';

/**
 * Handler that sets custom headers on the response.
 */
export class HeaderHandler extends HttpHandler {
  private readonly headers: Record<string, string>;

  public constructor() {
    super();
    this.headers = {
      'x-powered-by': 'Community Solid Server',
    };
  }

  public async handle({ response }: { response: HttpResponse }): Promise<void> {
    for (const header of Object.keys(this.headers)) {
      response.setHeader(header, this.headers[header]);
    }
  }
}
