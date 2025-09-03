import { AsyncHandler } from 'asynchronous-handlers';
import type { KoaContextWithOIDC } from 'oidc-provider';
import type { Operation } from '../../http/Operation';
import type { Representation } from '../../http/representation/Representation';

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
  /**
   * The account id of the agent doing the request if one could be found.
   */
  accountId?: string;
}

/**
 * Handler used for IDP interactions.
 */
export abstract class InteractionHandler extends AsyncHandler<InteractionHandlerInput, Representation> {}
