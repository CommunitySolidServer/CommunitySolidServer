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
  private readonly logger = getLoggerFor(this);

  public readonly policy: interactionPolicy.Prompt[];
  public readonly url: (ctx: KoaContextWithOIDC) => string;

  public constructor(idpPathName: string) {
    const interactions = interactionPolicy.base();
    const selectAccount = new interactionPolicy.Prompt({
      name: 'select_account',
      requestable: true,
    });
    interactions.add(selectAccount, 0);
    this.policy = interactions;
    this.url = this.createUrlFunction(idpPathName);
  }

  /**
   * Helper function to create the function that will be put in `url`.
   * Needs to be done like this since the `this` reference is lost when passing this value along.
   */
  private createUrlFunction(idpPathName: string): (ctx: KoaContextWithOIDC) => string {
    return (ctx: KoaContextWithOIDC): string => `/${idpPathName}/interaction/${ctx.oidc.uid}`;
  }
}
