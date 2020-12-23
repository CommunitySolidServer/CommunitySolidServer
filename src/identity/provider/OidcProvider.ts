import type { IncomingMessage, ServerResponse } from 'http';
import { Provider } from 'oidc-provider';

/**
 * An extention of Provider with extra methods to make it easier to slot
 * into the CSS architecture.
 */
export abstract class OidcProvider extends Provider {
  /**
   * Unlike the regular "Provider" class from node-oidc-provider, asyncCallback
   * returns a promise that will either resolve if a response is given (including
   * if the response is an error page) and throw an error if the idp cannot handle
   * the request.
   */
  abstract asyncCallback(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
