import type { Configuration } from 'oidc-provider';
import type {
  SolidIdentityProviderInteractionPolicyHttpHandler,
} from './SolidIdentityProviderInteractionPolicyHttpHandler';

export interface SolidIdentityProviderConfiguration extends Configuration {
  interactions: SolidIdentityProviderInteractionPolicyHttpHandler;
}
