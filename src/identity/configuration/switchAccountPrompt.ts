import type { KoaContextWithOIDC } from 'oidc-provider';
import { interactionPolicy } from 'oidc-provider';

export async function switchAccountCheckCallback(ctx: KoaContextWithOIDC): Promise<boolean> {
  // Prompt if the IDP remembered the user AND hasAskedToSwitchAccount is not present
  return Boolean(ctx.oidc.session?.authorizations) &&
    Boolean(!ctx.oidc.result || !ctx.oidc.result.hasAskedToSwitchAccount);
}

/**
 * A Prompt that triggers when a user is already logged in, allowing them to swap accounts
 */
export const switchAccountPrompt = new interactionPolicy.Prompt(
  { name: 'switchaccount', requestable: true },
  new interactionPolicy.Check(
    'active_session',
    'The End User has an active session and has not been asked to switch accounts yet',
    switchAccountCheckCallback,
  ),
);
