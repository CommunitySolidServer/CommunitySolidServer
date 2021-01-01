import type { HttpHandlerInput } from '../server/HttpHandler';
import { AsyncHandler } from '../util/AsyncHandler';
import type { SolidIdentityProvider } from './SolidIdentityProvider';

export type InteractionHttpHandlerInput = HttpHandlerInput & {
  provider: SolidIdentityProvider;
};

export abstract class InteractionHttpHandler
  extends AsyncHandler<InteractionHttpHandlerInput> {}
