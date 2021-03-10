import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import { getLoggerFor } from '../../../logging/LogUtil';
import type {
  IdpInteractionPolicy,
} from '../IdpInteractionPolicy';

/**
 * The InteractionPolicy for the EmailPassword Interaction
 * This interaction identifies the user with their email and validates
 * the user with a password. If the user forgets their password, they
 * can reset it by typing in their email. The scheme for interactions
 * is /idp/interaction/:uid
 */
export class EmailPasswordInteractionPolicy implements IdpInteractionPolicy {
  public readonly policy: interactionPolicy.Prompt[];
  private readonly logger = getLoggerFor(this);

  public constructor() {
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
}
