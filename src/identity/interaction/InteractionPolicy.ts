import type { CanBePromise, interactionPolicy, KoaContextWithOIDC } from 'oidc-provider';

/**
 * Config options to communicate exactly how to handle requests.
 */
export interface InteractionPolicy {
  policy: interactionPolicy.Prompt[];
  url: (ctx: KoaContextWithOIDC) => CanBePromise<string>;
}
