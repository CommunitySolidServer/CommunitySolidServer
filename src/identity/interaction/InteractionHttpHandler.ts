import type { Provider } from 'oidc-provider';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export type InteractionHttpHandlerInput = HttpHandlerInput & {
  provider: Provider;
};

export abstract class InteractionHttpHandler extends AsyncHandler<InteractionHttpHandlerInput> {}
