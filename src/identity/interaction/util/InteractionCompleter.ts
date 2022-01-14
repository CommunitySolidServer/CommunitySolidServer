import { AsyncHandler } from '../../../util/handlers/AsyncHandler';
import type { Interaction } from '../InteractionHandler';

/**
 * Parameters required to specify how the interaction should be completed.
 */
export interface InteractionCompleterInput {
  oidcInteraction: Interaction;
  webId: string;
  shouldRemember?: boolean;
}

/**
 * Class responsible for completing the interaction based on the parameters provided.
 */
export abstract class InteractionCompleter extends AsyncHandler<InteractionCompleterInput, string> {}
