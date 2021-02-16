import type { Provider } from 'oidc-provider';
import type { HttpHandlerInput } from '../../server/HttpHandler';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export type IdpInteractionHttpHandlerInput = HttpHandlerInput & {
  provider: Provider;
};

/**
 * A special Http Handler that passes the IdP as one
 * of the options
 */
export abstract class IdpInteractionHttpHandler
  extends AsyncHandler<IdpInteractionHttpHandlerInput> {}
