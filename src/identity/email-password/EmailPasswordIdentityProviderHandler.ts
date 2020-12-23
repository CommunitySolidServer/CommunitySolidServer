import type { IncomingMessage, ServerResponse } from 'http';
import { getLoggerFor } from '../../logging/LogUtil';
import { HttpHandler } from '../../server/HttpHandler';
import type { Guarded } from '../../util/GuardedStream';
import type { OidcProviderFactory } from '../provider/OidcProviderFactory';

interface EmailPasswordIdentityProviderHandlerArgs {
  oidcProviderFactory: OidcProviderFactory;
}

export class EmailPasswordIdentityProviderHandler extends HttpHandler {
  private readonly oidcProviderFactory: OidcProviderFactory;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordIdentityProviderHandlerArgs) {
    super();
    this.oidcProviderFactory = args.oidcProviderFactory;
  }

  public async handle(input: {
    request: Guarded<IncomingMessage>;
    response: ServerResponse;
  }): Promise<void> {
    this.logger.verbose('Handling Email Passord Identity Provider Request');
    const provider = await this.oidcProviderFactory.createOidcProvider();
    await provider.asyncCallback(input.request, input.response);
  }
}
