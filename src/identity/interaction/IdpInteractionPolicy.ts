import type { CanBePromise, interactionPolicy, KoaContextWithOIDC } from 'oidc-provider';

/**
 * A kind of HttpHandler the also has config options to communicate
 * exactly how it handles requests.
 */
export interface IdpInteractionPolicy {
  policy: interactionPolicy.Prompt[];
  url: (ctx: KoaContextWithOIDC) => CanBePromise<string>;
}
