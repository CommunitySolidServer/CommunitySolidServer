import type { Provider } from 'oidc-provider';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export type IdPInteractionHttpHandlerInput = HttpHandlerInput & {
  provider: Provider;
};

export abstract class IdPInteractionHttpHandler
  extends AsyncHandler<IdPInteractionHttpHandlerInput> {}
