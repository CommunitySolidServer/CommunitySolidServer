import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import type {
  InteractionPolicy,
} from '../InteractionPolicy';

/**
 * Interaction policy that maps URLs to `/${idpPathName}/interaction/${context uid}`.
 * Uses the `select_account` interaction policy.
 */
export class AccountInteractionPolicy implements InteractionPolicy {
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
