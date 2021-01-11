import type { Configuration } from 'oidc-provider';
import type {
  IdPInteractionPolicyHttpHandler,
} from '../interaction/IdPInteractionPolicyHttpHandler';

export interface IdPConfiguration extends Configuration {
  interactions: IdPInteractionPolicyHttpHandler;
}
