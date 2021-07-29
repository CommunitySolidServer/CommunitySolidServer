import type { HttpHandlerInput } from '../../../../server/HttpHandler';
import { AsyncHandler } from '../../../../util/handlers/AsyncHandler';
import type { InteractionCompleterParams } from '../../util/InteractionCompleter';

export type InteractionHandlerResult = InteractionResponseResult | InteractionCompleteResult;

export interface InteractionResponseResult<T = NodeJS.Dict<any>> {
  type: 'response';
  details: T;
}

export interface InteractionCompleteResult {
  type: 'complete';
  details: InteractionCompleterParams;
}

/**
 * Handler used for IDP interactions.
 */
export abstract class InteractionHandler extends AsyncHandler<HttpHandlerInput, InteractionHandlerResult> {}
