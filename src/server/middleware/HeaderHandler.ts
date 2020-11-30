import { HttpHandler } from '../HttpHandler';
import type { HttpResponse } from '../HttpResponse';

/**
 * Handler that sets custom headers on the response.
 */
export class HeaderHandler extends HttpHandler {
  private readonly headers: Record<string, string>;

  public constructor(headers: Record<string, string>) {
    super();
    this.headers = { ...headers };
  }

  public async handle({ response }: { response: HttpResponse }): Promise<void> {
    for (const header of Object.keys(this.headers)) {
      response.setHeader(header, this.headers[header]);
    }
  }
}
