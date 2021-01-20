import type { InteractionResults } from 'oidc-provider';
import { getLoggerFor } from '../../../logging/LogUtil';
import { AsyncHandler } from '../../../util/AsyncHandler';
import type { IdPInteractionHttpHandlerInput } from '../IdPInteractionHttpHandler';

export interface OidcInteractionCompleterInput extends IdPInteractionHttpHandlerInput {
  webId: string;
  shouldRemember?: boolean;
}

export class OidcInteractionCompleter extends AsyncHandler<OidcInteractionCompleterInput> {
  private readonly logger = getLoggerFor(this);

  public async handle(input: OidcInteractionCompleterInput): Promise<void> {
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

    return input.provider.interactionFinished(input.request, input.response, result);
  }
}
