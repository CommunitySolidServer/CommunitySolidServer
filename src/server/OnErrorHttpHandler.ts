import { OnErrorHandler } from '../util/handlers/OnErrorHandler';
import type { HttpHandlerInput } from './HttpHandler';

/**
 * A handler that receives an error and makes a response from that error.
 */
export abstract class OnErrorHttpHandler extends OnErrorHandler<HttpHandlerInput, void> {}
