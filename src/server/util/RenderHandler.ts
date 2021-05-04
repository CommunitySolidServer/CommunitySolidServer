import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { HttpResponse } from '../HttpResponse';

export interface RenderHandlerInput {}

/**
 * Renders a result with the given props and sends it to the HttpResponse.
 */
export abstract class RenderHandler<T> extends AsyncHandler<{ response: HttpResponse; props: T }> {}
