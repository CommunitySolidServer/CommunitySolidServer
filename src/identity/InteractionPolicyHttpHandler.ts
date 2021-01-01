import type { CanBePromise, interactionPolicy, KoaContextWithOIDC } from 'oidc-provider';
import { InteractionHttpHandler } from './InteractionHttpHandler';

export abstract class InteractionPolicyHttpHandler
  extends InteractionHttpHandler {
  public abstract readonly policy: interactionPolicy.Prompt[];
  public abstract url(ctx: KoaContextWithOIDC): CanBePromise<string>;
}
