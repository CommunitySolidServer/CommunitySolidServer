import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import type {
  InteractionHttpHandler,
  InteractionHttpHandlerInput,
} from '../../InteractionHttpHandler';
import {
  InteractionPolicyHttpHandler,
} from '../../InteractionPolicyHttpHandler';

export interface EmailPasswordInteractionPolicyHttpHandlerArgs {
  interactionHttpHandler: InteractionHttpHandler;
}

export class EmailPasswordInteractionPolicyHttpHandler extends InteractionPolicyHttpHandler {
  public readonly policy: interactionPolicy.Prompt[];
  private readonly interactionHttpHandler: InteractionHttpHandler;

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
    return `/interaction/${ctx.oidc.uid}`;
  }

  public async canHandle(input: InteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.canHandle(input);
  }

  public async handle(input: InteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.handle(input);
  }
}
