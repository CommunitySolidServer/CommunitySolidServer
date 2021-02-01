import { AsyncHandler } from '../../util/handlers/AsyncHandler';
import type { HttpResponse } from '../HttpResponse';

export interface RenderHandlerInput {}

export abstract class RenderHandler<T> extends AsyncHandler<{
  response: HttpResponse;
  props: T;
}> {}
