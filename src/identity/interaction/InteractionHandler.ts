import type { KoaContextWithOIDC } from '../../../templates/types/oidc-provider';
import type { Operation } from '../../http/Operation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

// OIDC library does not directly export the Interaction type
export type Interaction = NonNullable<KoaContextWithOIDC['oidc']['entities']['Interaction']>;

export interface InteractionHandlerInput {
  /**
   * The operation to execute.
   */
  operation: Operation;
  /**
   * Will be defined if the OIDC library expects us to resolve an interaction it can't handle itself,
   * such as logging a user in.
   */
  oidcInteraction?: Interaction;
}

/**
 * Handler used for IDP interactions.
 * Only supports JSON data.
 */
export abstract class InteractionHandler extends AsyncHandler<InteractionHandlerInput, Representation> {
  public async canHandle({ operation }: InteractionHandlerInput): Promise<void> {
    const { contentType } = operation.body.metadata;
    if (contentType && contentType !== APPLICATION_JSON) {
      throw new NotImplementedHttpError('Only application/json data is supported.');
    }
  }
}
