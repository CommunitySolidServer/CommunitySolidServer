import type { HttpHandlerInput } from '../../server/HttpHandler';
import { AsyncHandler } from '../../util/AsyncHandler';
import type { SolidIdentityProvider } from '../SolidIdentityProvider';

export type IdPInteractionHttpHandlerInput = HttpHandlerInput & {
  provider: SolidIdentityProvider;
};

export abstract class IdPInteractionHttpHandler
  extends AsyncHandler<IdPInteractionHttpHandlerInput> {}
