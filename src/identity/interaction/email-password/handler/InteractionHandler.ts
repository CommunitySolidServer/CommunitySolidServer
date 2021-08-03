import type { KoaContextWithOIDC } from 'oidc-provider';
import type { HttpRequest } from '../../../../server/HttpRequest';
import { AsyncHandler } from '../../../../util/handlers/AsyncHandler';
import type { InteractionCompleterParams } from '../../util/InteractionCompleter';

// OIDC library does not directly export the Interaction type
export type Interaction = KoaContextWithOIDC['oidc']['entities']['Interaction'];

export interface InteractionHandlerInput {
  /**
   * The request being made.
   */
  request: HttpRequest;
  /**
   * Will be defined if the OIDC library expects us to resolve an interaction it can't handle itself,
   * such as logging a user in.
   */
  oidcInteraction?: Interaction;
}

export type InteractionHandlerResult = InteractionResponseResult | InteractionCompleteResult;

export interface InteractionResponseResult<T = NodeJS.Dict<any>> {
  type: 'response';
  details?: T;
}

export interface InteractionCompleteResult {
  type: 'complete';
  details: InteractionCompleterParams;
}

/**
 * Handler used for IDP interactions.
 */
export abstract class InteractionHandler extends AsyncHandler<InteractionHandlerInput, InteractionHandlerResult> {}
