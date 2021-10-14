import { ServerResponse } from 'http';
import type { InteractionResults } from 'oidc-provider';
import type { HttpRequest } from '../../../server/HttpRequest';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { ProviderFactory } from '../../configuration/ProviderFactory';

/**
 * Parameters required to specify how the interaction should be completed.
 */
export interface InteractionCompleterParams {
  webId: string;
  shouldRemember?: boolean;
}

export interface InteractionCompleterInput extends InteractionCompleterParams {
  request: HttpRequest;
}

/**
 * Completes an IDP interaction, logging the user in.
 * Returns the URL the request should be redirected to.
 */
export class InteractionCompleter extends AsyncHandler<InteractionCompleterInput, string> {
  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super();
    this.providerFactory = providerFactory;
  }

  public async handle(input: InteractionCompleterInput): Promise<string> {
    const provider = await this.providerFactory.getProvider();
    const result: InteractionResults = {
      login: {
        account: input.webId,
        remember: input.shouldRemember,
        ts: Math.floor(Date.now() / 1000),
      },
      consent: {
        rejectedScopes: input.shouldRemember ? [] : [ 'offline_access' ],
      },
    };

    // Response object is not actually needed here so we can just mock it like this
    // to bypass the OIDC library checks.
    // See https://github.com/panva/node-oidc-provider/discussions/1078
    return provider.interactionResult(input.request, Object.create(ServerResponse.prototype), result);
  }
}
