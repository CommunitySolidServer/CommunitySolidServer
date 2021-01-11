import { AsyncHandler } from '../../util/AsyncHandler';
import { IdentityProviderHttpHandlerInput } from '../IdentityProviderHttpHandler';

export abstract class IdPInteractionHttpHandler
  extends AsyncHandler<IdentityProviderHttpHandlerInput> {}
