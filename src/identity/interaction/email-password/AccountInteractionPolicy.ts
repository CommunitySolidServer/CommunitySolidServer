import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';
import { ensureTrailingSlash } from '../../../util/PathUtil';
import type {
  InteractionPolicy,
} from '../InteractionPolicy';

/**
 * Interaction policy that redirects to `idpPath`.
 * Uses the `select_account` interaction policy.
 */
export class AccountInteractionPolicy implements InteractionPolicy {
  public readonly policy: interactionPolicy.Prompt[];
  public readonly url: (ctx: KoaContextWithOIDC) => string;

  public constructor(idpPath: string) {
    if (!idpPath.startsWith('/')) {
      throw new Error('idpPath needs to start with a /');
    }
    const interactions = interactionPolicy.base();
    const selectAccount = new interactionPolicy.Prompt({
      name: 'select_account',
      requestable: true,
    });
    interactions.add(selectAccount, 0);
    this.policy = interactions;

    // When oidc-provider cannot fulfill the authorization request for any of the possible reasons
    // (missing user session, requested ACR not fulfilled, prompt requested, ...)
    // it will resolve the interactions.url helper function and redirect the User-Agent to that url.
    this.url = (): string => ensureTrailingSlash(idpPath);
  }
}
