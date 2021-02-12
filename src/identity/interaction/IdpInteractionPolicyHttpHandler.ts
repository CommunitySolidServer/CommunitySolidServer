import type { CanBePromise, interactionPolicy, KoaContextWithOIDC } from 'oidc-provider';
import { IdpInteractionHttpHandler } from './IdpInteractionHttpHandler';

/**
 * A kind of HttpHandler the also has config options to communicate
 * exactly how it handles requests.
 */
export abstract class IdpInteractionPolicyHttpHandler
  extends IdpInteractionHttpHandler {
  public abstract readonly policy: interactionPolicy.Prompt[];
  public abstract url(ctx: KoaContextWithOIDC): CanBePromise<string>;
}
