import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import { getLoggerFor } from '../../../logging/LogUtil';
import type {
  IdpInteractionHttpHandler, IdpInteractionHttpHandlerInput,
} from '../IdpInteractionHttpHandler';
import {
  IdpInteractionPolicyHttpHandler,
} from '../IdpInteractionPolicyHttpHandler';

export interface EmailPasswordInteractionPolicyHttpHandlerArgs {
  interactionHttpHandler: IdpInteractionHttpHandler;
}

/**
 * The InteractionPolicyHttpHandler for the EmailPassword Interaction
 * This interaction identifies the user with their email and validates
 * the user with a password. If the user forgets their password, they
 * can reset it by typing in their email. The scheme for interactions
 * is /idp/interaction/:uid
 */
export class EmailPasswordInteractionPolicyHttpHandler extends IdpInteractionPolicyHttpHandler {
  public readonly policy: interactionPolicy.Prompt[];
  private readonly interactionHttpHandler: IdpInteractionHttpHandler;
  private readonly logger = getLoggerFor(this);

  public constructor(args: EmailPasswordInteractionPolicyHttpHandlerArgs) {
    super();
    this.interactionHttpHandler = args.interactionHttpHandler;
    const interactions = interactionPolicy.base();
    const selectAccount = new interactionPolicy.Prompt({
      name: 'select_account',
      requestable: true,
    });
    interactions.add(selectAccount, 0);
    this.policy = interactions;
  }

  public async url(ctx: KoaContextWithOIDC): Promise<string> {
    return `/idp/interaction/${ctx.oidc.uid}`;
  }

  public async canHandle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.canHandle(input);
  }

  public async handle(input: IdpInteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.handle(input);
  }
}
