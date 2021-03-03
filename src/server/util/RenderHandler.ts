import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { HttpResponse } from '../HttpResponse';

export interface RenderHandlerInput {}

/**
 * Renders a response given data and sends that
 * response as text/html
 */
export abstract class RenderHandler<T> extends AsyncHandler<{
  response: HttpResponse;
  props: T;
}> {}
