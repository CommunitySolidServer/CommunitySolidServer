import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import { getLoggerFor } from '../../../logging/LogUtil';
import type {
  IdPInteractionHttpHandler, IdPInteractionHttpHandlerInput,
} from '../IdPInteractionHttpHandler';
import {
  IdPInteractionPolicyHttpHandler,
} from '../IdPInteractionPolicyHttpHandler';

export interface EmailPasswordInteractionPolicyHttpHandlerArgs {
  interactionHttpHandler: IdPInteractionHttpHandler;
}

export class EmailPasswordInteractionPolicyHttpHandler extends IdPInteractionPolicyHttpHandler {
  public readonly policy: interactionPolicy.Prompt[];
  private readonly interactionHttpHandler: IdPInteractionHttpHandler;
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
    return `/interaction/${ctx.oidc.uid}`;
  }

  public async canHandle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.canHandle(input);
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.handle(input);
  }
}
