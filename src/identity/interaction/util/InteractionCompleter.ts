import type { InteractionResults } from 'oidc-provider';
import type { HttpHandlerInput } from '../../../server/HttpHandler';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { ProviderFactory } from '../../configuration/ProviderFactory';

export interface InteractionCompleterParams {
  webId: string;
  shouldRemember?: boolean;
}

export type InteractionCompleterInput = HttpHandlerInput & InteractionCompleterParams;

/**
 * Completes an IDP interaction, logging the user in.
 */
export class InteractionCompleter extends AsyncHandler<InteractionCompleterInput> {
  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super();
    this.providerFactory = providerFactory;
  }

  public async handle(input: InteractionCompleterInput): Promise<void> {
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

    return provider.interactionFinished(input.request, input.response, result);
  }
}
