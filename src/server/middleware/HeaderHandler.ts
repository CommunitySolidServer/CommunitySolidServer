import { HttpHandler } from '../HttpHandler';
import type { HttpResponse } from '../HttpResponse';

/**
 * Handler that sets custom headers on the response.
 */
export class HeaderHandler extends HttpHandler {
  private readonly headers: Record<string, string>;

  // Not supported by Components.js yet
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  public constructor(headers: { [header: string]: string } = {}) {
    super();
    this.headers = { ...headers };
  }

  public async handle({ response }: { response: HttpResponse }): Promise<void> {
    for (const header of Object.keys(this.headers)) {
      response.setHeader(header, this.headers[header]);
    }
  }
}
