import { getLoggerFor } from '../logging/LogUtil';
import { HttpHandler } from '../server/HttpHandler';
import type { HttpRequest } from '../server/HttpRequest';
import type { HttpResponse } from '../server/HttpResponse';

export interface IdentityProviderHandlerArgs {}

export class IdentityProviderHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);

  public constructor(args: IdentityProviderHandlerArgs) {
    super();
    Object.assign(this, args);
  }

  public async canHandle(): Promise<void> {
    /* Do nothing for now */
  }

  public async handle(input: { request: HttpRequest; response: HttpResponse }): Promise<void> {
    this.logger.verbose(`Handling Identity Provider request for ${input.request.url}`);
    throw new Error(`Method not implemented`);
  }
}
