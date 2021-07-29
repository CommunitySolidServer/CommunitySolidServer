import type { HttpHandlerInput } from '../../server/HttpHandler';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { ProviderFactory } from '../configuration/ProviderFactory';
import { InteractionHandler } from './email-password/handler/InteractionHandler';
import type { InteractionCompleteResult } from './email-password/handler/InteractionHandler';

/**
 * Simple InteractionHttpHandler that sends the session accountId to the InteractionCompleter as webId.
 */
export class SessionHttpHandler extends InteractionHandler {
  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super();
    this.providerFactory = providerFactory;
  }

  public async handle(input: HttpHandlerInput): Promise<InteractionCompleteResult> {
    const provider = await this.providerFactory.getProvider();
    const details = await provider.interactionDetails(input.request, input.response);
    if (!details.session || !details.session.accountId) {
      throw new NotImplementedHttpError('Only confirm actions with a session and accountId are supported');
    }
    return {
      type: 'complete',
      details: { webId: details.session.accountId },
    };
  }
}
