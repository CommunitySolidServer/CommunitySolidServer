import { NotFoundHttpError } from '../../../util/errors/NotFoundHttpError';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { InteractionRoute } from './InteractionRoute';

/**
 * InteractionHandler that only accepts input of which the target matches the stored route.
 *
 * Rejects operations that target a different route,
 * otherwise the input parameters are passed to the source handler.
 */
export class InteractionRouteHandler<T extends InteractionRoute<string>> extends JsonInteractionHandler {
  protected readonly route: T;
  protected readonly source: JsonInteractionHandler;

  public constructor(route: T, source: JsonInteractionHandler) {
    super();
    this.route = route;
    this.source = source;
  }

  public async canHandle(input: JsonInteractionHandlerInput): Promise<void> {
    const { target } = input;

    if (!this.route.matchPath(target.path)) {
      throw new NotFoundHttpError();
    }
    await this.source.canHandle(input);
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    return this.source.handle(input);
  }
}
