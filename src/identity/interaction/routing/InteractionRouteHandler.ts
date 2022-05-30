import type { Representation } from '../../../http/representation/Representation';
import { NotFoundHttpError } from '../../../util/errors/NotFoundHttpError';
import type { InteractionHandlerInput } from '../InteractionHandler';
import { InteractionHandler } from '../InteractionHandler';
import type { InteractionRoute } from './InteractionRoute';

/**
 * InteractionHandler that only accepts operations with an expected path.
 *
 * Rejects operations that target a different path,
 * otherwise the input parameters are passed to the source handler.
 */
export class InteractionRouteHandler extends InteractionHandler {
  private readonly route: InteractionRoute;
  private readonly source: InteractionHandler;

  public constructor(route: InteractionRoute, source: InteractionHandler) {
    super();
    this.route = route;
    this.source = source;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    const { target } = input.operation;
    const path = this.route.getPath();
    if (target.path !== path) {
      throw new NotFoundHttpError();
    }
    await this.source.canHandle(input);
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    return this.source.handle(input);
  }
}
