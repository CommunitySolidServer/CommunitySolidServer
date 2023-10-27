import { OkResponseDescription } from '../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../http/output/response/ResponseDescription';
import { getLoggerFor } from '../logging/LogUtil';
import type { OperationHttpHandlerInput } from '../server/OperationHttpHandler';
import { OperationHttpHandler } from '../server/OperationHttpHandler';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { SOLID_HTTP } from '../util/Vocabularies';
import type { ProviderFactory } from './configuration/ProviderFactory';
import type { CookieStore } from './interaction/account/util/CookieStore';
import type { Interaction, InteractionHandler } from './interaction/InteractionHandler';

export interface IdentityProviderHttpHandlerArgs {
  /**
   * Used to generate the OIDC provider.
   */
  providerFactory: ProviderFactory;
  /**
   * Used to determine the account of the requesting agent.
   */
  cookieStore: CookieStore;
  /**
   * Handles the requests.
   */
  handler: InteractionHandler;
}

/**
 * Generates the active Interaction object if there is an ongoing OIDC interaction.
 * Finds the account ID if there is cookie metadata.
 *
 * Calls the stored {@link InteractionHandler} with that information and returns the result.
 */
export class IdentityProviderHttpHandler extends OperationHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly providerFactory: ProviderFactory;
  private readonly cookieStore: CookieStore;
  private readonly handler: InteractionHandler;

  public constructor(args: IdentityProviderHttpHandlerArgs) {
    super();
    this.providerFactory = args.providerFactory;
    this.cookieStore = args.cookieStore;
    this.handler = args.handler;
  }

  public async handle({ operation, request, response }: OperationHttpHandlerInput): Promise<ResponseDescription> {
    // This being defined means we're in an OIDC session
    let oidcInteraction: Interaction | undefined;
    try {
      const provider = await this.providerFactory.getProvider();
      oidcInteraction = await provider.interactionDetails(request, response);
      this.logger.debug('Found an active OIDC interaction.');
    } catch (error: unknown) {
      this.logger.debug(`No active OIDC interaction found: ${createErrorMessage(error)}`);
    }

    // Determine account
    let accountId: string | undefined;
    const cookie = operation.body.metadata.get(SOLID_HTTP.terms.accountCookie)?.value;
    if (cookie) {
      accountId = await this.cookieStore.get(cookie);
    }

    const representation = await this.handler.handleSafe({ operation, oidcInteraction, accountId });
    return new OkResponseDescription(representation.metadata, representation.data);
  }
}
