import type { IncomingMessage, ServerResponse } from 'http';
import { getLoggerFor } from '../../logging/LogUtil';
import { HttpHandler } from '../../server/HttpHandler';
import type { Guarded } from '../../util/GuardedStream';
import type { OidcProviderFactory } from '../provider/OidcProviderFactory';

interface EmailPasswordIdentityProviderHandlerArgs {
  oidcProviderFactory: OidcProviderFactory;
  interactionHttpHandler: HttpHandler;
}

export class EmailPasswordIdentityProviderHandler extends HttpHandler {
  private readonly oidcProviderFactory: OidcProviderFactory;
  private readonly interactionHttpHandler: HttpHandler;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordIdentityProviderHandlerArgs) {
    super();
    this.oidcProviderFactory = args.oidcProviderFactory;
    this.interactionHttpHandler = args.interactionHttpHandler;
  }

  public async handle(input: {
    request: Guarded<IncomingMessage>;
    response: ServerResponse;
  }): Promise<void> {
    this.logger.verbose('Handling Email Passord Identity Provider Request');
    const provider = await this.oidcProviderFactory.createOidcProvider();
    try {
      await this.interactionHttpHandler.handleSafe(input);
    } catch {
      // Do Nothing
    }
    await provider.asyncCallback(input.request, input.response);
  }
}
