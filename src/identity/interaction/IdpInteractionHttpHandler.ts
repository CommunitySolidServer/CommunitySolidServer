import type { Provider } from 'oidc-provider';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export type IdpInteractionHttpHandlerInput = HttpHandlerInput & {
  provider: Provider;
};

export abstract class IdpInteractionHttpHandler extends AsyncHandler<IdpInteractionHttpHandlerInput> {}
