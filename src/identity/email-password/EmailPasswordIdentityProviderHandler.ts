import type { IncomingMessage, ServerResponse } from 'http';
import { getLoggerFor } from '../../logging/LogUtil';
import { HttpHandler } from '../../server/HttpHandler';
import type { Guarded } from '../../util/GuardedStream';
import type { SolidIdentityProviderFactory } from '../provider/SolidIdentityProviderFactory';

interface EmailPasswordIdentityProviderHandlerArgs {
  solidIdentityProviderFactory: SolidIdentityProviderFactory;
  interactionHttpHandler: HttpHandler;
}

export class EmailPasswordIdentityProviderHandler extends HttpHandler {
  private readonly solidIdentityProviderFactory: SolidIdentityProviderFactory;
  private readonly interactionHttpHandler: HttpHandler;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordIdentityProviderHandlerArgs) {
    super();
    this.solidIdentityProviderFactory = args.solidIdentityProviderFactory;
    this.interactionHttpHandler = args.interactionHttpHandler;
  }

  public async handle(input: {
    request: Guarded<IncomingMessage>;
    response: ServerResponse;
  }): Promise<void> {
    this.logger.verbose('Handling Email Passord Identity Provider Request');
    const provider = await this.solidIdentityProviderFactory.createSolidIdentityProvider();
    try {
      await this.interactionHttpHandler.handleSafe(input);
    } catch {
      // Do Nothing
    }
    await provider.handleSafe({ request: input.request, response: input.response });
  }
}
