import { FoundHttpError } from '../../../util/errors/FoundHttpError';
import { assertOidcInteraction, finishInteraction } from '../InteractionUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';

/**
 * Cancel an active OIDC interaction.
 */
export class CancelOidcHandler extends JsonInteractionHandler<never> {
  public async handle({ oidcInteraction }: JsonInteractionHandlerInput): Promise<JsonRepresentation<never>> {
    assertOidcInteraction(oidcInteraction);
    const error = {
      error: 'access_denied',
      // eslint-disable-next-line ts/naming-convention
      error_description: 'User cancelled the interaction.',
    };

    const location = await finishInteraction(oidcInteraction, error, false);

    throw new FoundHttpError(location);
  }
}
