import { FoundHttpError } from '../../../util/errors/FoundHttpError';
import type { ProviderFactory } from '../../configuration/ProviderFactory';
import { assertOidcInteraction, finishInteraction, forgetWebId } from '../InteractionUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';

/**
 * Forgets the chosen WebID in an OIDC interaction,
 * causing the next policy trigger to be one where a new WebID has to be chosen.
 */
export class ForgetWebIdHandler extends JsonInteractionHandler<never> {
  private readonly providerFactory: ProviderFactory;

  public constructor(providerFactory: ProviderFactory) {
    super();
    this.providerFactory = providerFactory;
  }

  public async handle({ oidcInteraction }: JsonInteractionHandlerInput): Promise<JsonRepresentation<never>> {
    assertOidcInteraction(oidcInteraction);

    await forgetWebId(await this.providerFactory.getProvider(), oidcInteraction);

    // Finish the interaction so the policies get checked again
    const location = await finishInteraction(oidcInteraction, {}, false);

    throw new FoundHttpError(location);
  }
}
