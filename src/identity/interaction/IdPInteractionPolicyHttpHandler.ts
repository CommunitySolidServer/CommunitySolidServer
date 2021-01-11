import type { CanBePromise, interactionPolicy, KoaContextWithOIDC } from 'oidc-provider';
import { IdPInteractionHttpHandler } from './IdPInteractionHttpHandler';

export abstract class IdPInteractionPolicyHttpHandler
  extends IdPInteractionHttpHandler {
  public abstract readonly policy: interactionPolicy.Prompt[];
  public abstract url(ctx: KoaContextWithOIDC): CanBePromise<string>;
}
