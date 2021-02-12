import { OnErrorHandler } from '../util/handlers/ErrorHandlingWaterfallHandler';
import type { HttpHandlerInput } from './HttpHandler';

export abstract class OnErrorHttpHandler extends OnErrorHandler<HttpHandlerInput, void> {}
