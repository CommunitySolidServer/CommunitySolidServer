import { interactionPolicy } from 'oidc-provider';
import type {
  SolidIdentityProviderInteractionHttpHandler,
  SolidIdentityProviderInteractionHttpHandlerInput,
} from '../../SolidIdentityProviderInteractionHttpHandler';
import {
  SolidIdentityProviderInteractionPolicyHttpHandler,
} from '../../SolidIdentityProviderInteractionPolicyHttpHandler';

export interface EmailPasswordInteractionPolicyHttpHandlerArgs {
  interactionHttpHandler: SolidIdentityProviderInteractionHttpHandler;
}

export class EmailPasswordInteractionPolicyHttpHandler extends SolidIdentityProviderInteractionPolicyHttpHandler {
  public readonly policy: interactionPolicy.Prompt[];
  private readonly interactionHttpHandler: SolidIdentityProviderInteractionHttpHandler;

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

  public async getPath(uid: string): Promise<string> {
    return `/interaction/${uid}`;
  }

  public async handle(input: SolidIdentityProviderInteractionHttpHandlerInput): Promise<void> {
    return this.interactionHttpHandler.handleSafe(input);
  }
}
