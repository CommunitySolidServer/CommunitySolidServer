import type { Representation } from '../../../http/representation/Representation';
import { NotFoundHttpError } from '../../../util/errors/NotFoundHttpError';
import { UnsupportedAsyncHandler } from '../../../util/handlers/UnsupportedAsyncHandler';
import { InteractionHandler } from '../InteractionHandler';
import type { InteractionHandlerInput } from '../InteractionHandler';
import type { InteractionRoute } from './InteractionRoute';

/**
 * Default implementation of an InteractionHandler with an InteractionRoute.
 *
 * Rejects operations that target a different path,
 * otherwise the input parameters get passed to the source handler.
 *
 * In case no source handler is provided it defaults to an {@link UnsupportedAsyncHandler}.
 * This can be useful if you want an object with just the route.
 */
export class BasicInteractionRoute extends InteractionHandler implements InteractionRoute {
  private readonly path: string;
  private readonly source: InteractionHandler;

  public constructor(path: string, source?: InteractionHandler) {
    super();
    this.path = path;
    this.source = source ?? new UnsupportedAsyncHandler('This route has no associated handler.');
  }

  public getPath(): string {
    return this.path;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    const { target } = input.operation;
    const path = this.getPath();
    if (target.path !== path) {
      throw new NotFoundHttpError();
    }
    await this.source.canHandle(input);
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    return this.source.handle(input);
  }
}
