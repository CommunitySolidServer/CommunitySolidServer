import type { CanBePromise, interactionPolicy, KoaContextWithOIDC } from 'oidc-provider';
import { AsyncHandler } from '../../util/AsyncHandler';
import type { IdentityProviderHttpHandlerInput } from '../IdentityProviderHttpHandler';

export abstract class IdPInteractionPolicyHttpHandler
  extends AsyncHandler<IdentityProviderHttpHandlerInput> {
  public abstract readonly policy: interactionPolicy.Prompt[];
  public abstract url(ctx: KoaContextWithOIDC): CanBePromise<string>;
}
