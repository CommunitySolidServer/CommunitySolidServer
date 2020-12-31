import type { HttpHandlerInput } from '../server/HttpHandler';
import { AsyncHandler } from '../util/AsyncHandler';
import type { SolidIdentityProvider } from './SolidIdentityProvider';

export type SolidIdentityProviderInteractionHttpHandlerInput = HttpHandlerInput & {
  provider: SolidIdentityProvider;
};

export abstract class SolidIdentityProviderInteractionHttpHandler
  extends AsyncHandler<SolidIdentityProviderInteractionHttpHandlerInput> {}
