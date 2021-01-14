import { AsyncHandler } from '../../util/AsyncHandler';
import type { IdentityProviderHttpHandlerInput } from '../IdentityProviderHttpHandler';

export abstract class IdPInteractionHttpHandler
  extends AsyncHandler<IdentityProviderHttpHandlerInput> {}
