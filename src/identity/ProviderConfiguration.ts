import type { Configuration } from 'oidc-provider';
import type {
  InteractionPolicyHttpHandler,
} from './InteractionPolicyHttpHandler';

export interface ProviderConfiguration extends Configuration {
  interactions: InteractionPolicyHttpHandler;
}
