import type { IncomingMessage, ServerResponse } from 'http';
import type { Provider } from 'oidc-provider';
import { HttpHandler } from '../server/HttpHandler';
import { ConfigurationError } from '../util/errors/ConfigurationError';
import type { Guarded } from '../util/GuardedStream';
import type { OidcProviderFactory } from './oidc-provider/OidcProviderFactory';

export interface OidcProviderHttpHandlerArgs {
  oidcProviderFactory?: OidcProviderFactory;
  oidcProvider?: Provider;
}

const configurationErrorMessage = 'OidcProviderHttpHandler requires either an oidcProviderFactory or a provider';

export class OidcProviderHttpHandler extends HttpHandler {
  private oidcProvider?: Provider;
  private readonly oidcProviderFactoryPromise?: Promise<Provider>;

  public constructor(args: OidcProviderHttpHandlerArgs) {
    super();
    if (args.oidcProviderFactory) {
      this.oidcProviderFactoryPromise = args.oidcProviderFactory.createOidcProvider();
    } else if (args.oidcProvider) {
      this.oidcProvider = args.oidcProvider;
    } else {
      throw new ConfigurationError(configurationErrorMessage);
    }
  }

  private async lazyLoadOidcProvider(): Promise<Provider> {
    if (!this.oidcProvider) {
      if (!this.oidcProviderFactoryPromise) {
        throw new ConfigurationError(configurationErrorMessage);
      }
      this.oidcProvider = await this.oidcProviderFactoryPromise;
    }
    return this.oidcProvider;
  }

  public async handle(input: {
    request: Guarded<IncomingMessage>;
    response: ServerResponse;
  }): Promise<void> {
    const provider = await this.lazyLoadOidcProvider();
  }
}
