import type { Json } from '../../util/Json';
import { ControlHandler } from './ControlHandler';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';

/**
 * A {@link ControlHandler} that only returns results if there is an active OIDC interaction.
 */
export class OidcControlHandler extends ControlHandler {
  protected async generateControls(input: JsonInteractionHandlerInput): Promise<NodeJS.Dict<Json>> {
    if (!input.oidcInteraction) {
      return {};
    }

    return super.generateControls(input);
  }
}
