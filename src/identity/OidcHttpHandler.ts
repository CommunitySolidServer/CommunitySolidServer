import { getLoggerFor } from '../logging/LogUtil';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { ProviderFactory } from './configuration/ProviderFactory';

/**
 * HTTP handler that redirects all requests to the OIDC library.
 */
export class OidcHttpHandler extends HttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super();
    this.providerFactory = providerFactory;
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const provider = await this.providerFactory.getProvider();
    this.logger.debug(`Sending request to oidc-provider: ${request.url}`);
    // Even though the typings do not indicate this, this is a Promise that needs to be awaited.
    // Otherwise, the `BaseHttpServerFactory` will write a 404 before the OIDC library could handle the response.
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await provider.callback()(request, response);
  }
}
