import type { KoaContextWithOIDC } from 'oidc-provider';
import type { Operation } from '../../../../http/Operation';
import { APPLICATION_JSON } from '../../../../util/ContentTypes';
import { NotImplementedHttpError } from '../../../../util/errors/NotImplementedHttpError';
import { AsyncHandler } from '../../../../util/handlers/AsyncHandler';
import type { InteractionCompleterParams } from '../../util/InteractionCompleter';

// OIDC library does not directly export the Interaction type
export type Interaction = KoaContextWithOIDC['oidc']['entities']['Interaction'];

export interface InteractionHandlerInput {
  /**
   * The operation to execute
   */
  operation: Operation;
  /**
   * Will be defined if the OIDC library expects us to resolve an interaction it can't handle itself,
   * such as logging a user in.
   */
  oidcInteraction?: Interaction;
}

export type InteractionHandlerResult = InteractionResponseResult | InteractionCompleteResult | InteractionErrorResult;

export interface InteractionResponseResult<T = NodeJS.Dict<any>> {
  type: 'response';
  details?: T;
}

export interface InteractionCompleteResult {
  type: 'complete';
  details: InteractionCompleterParams;
}

export interface InteractionErrorResult {
  type: 'error';
  error: Error;
}

/**
 * Handler used for IDP interactions.
 * Only supports JSON data.
 */
export abstract class InteractionHandler extends AsyncHandler<InteractionHandlerInput, InteractionHandlerResult> {
  public async canHandle({ operation }: InteractionHandlerInput): Promise<void> {
    if (operation.body?.metadata.contentType !== APPLICATION_JSON) {
      throw new NotImplementedHttpError('Only application/json data is supported.');
    }
  }
}
