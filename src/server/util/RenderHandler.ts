import { AsyncHandler } from '../../util/AsyncHandler';
import type { HttpResponse } from '../HttpResponse';

export interface RenderHandlerInput {}

export abstract class RenderHandler<
  T extends Record<string, unknown>
> extends AsyncHandler<{
    response: HttpResponse;
    viewName: string;
    props: T;
  }> {}
