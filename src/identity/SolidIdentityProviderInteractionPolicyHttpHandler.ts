import type { interactionPolicy } from 'oidc-provider';
import { SolidIdentityProviderInteractionHttpHandler } from './SolidIdentityProviderInteractionHttpHandler';

export abstract class SolidIdentityProviderInteractionPolicyHttpHandler
  extends SolidIdentityProviderInteractionHttpHandler {
  public abstract readonly policy: interactionPolicy.Prompt[];
  public abstract getPath(uid: string): Promise<string>;
}
