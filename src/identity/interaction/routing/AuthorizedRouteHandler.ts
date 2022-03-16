import { getLoggerFor } from '../../../logging/LogUtil';
import { ForbiddenHttpError } from '../../../util/errors/ForbiddenHttpError';
import { UnauthorizedHttpError } from '../../../util/errors/UnauthorizedHttpError';
import type { AccountIdRoute } from '../account/AccountIdRoute';
import type { JsonRepresentation } from '../InteractionUtil';
import type {
  JsonInteractionHandler,
  JsonInteractionHandlerInput,

} from '../JsonInteractionHandler';
import { InteractionRouteHandler } from './InteractionRouteHandler';

/**
 * An {@link InteractionRouteHandler} specifically for an {@link AccountIdRoute}.
 * If there is no account ID, implying the user is not logged in,
 * an {@link UnauthorizedHttpError} will be thrown.
 * If there is an account ID, but it does not match the one in target resource,
 * a {@link ForbiddenHttpError} will be thrown.
 */
export class AuthorizedRouteHandler extends InteractionRouteHandler<AccountIdRoute> {
  private readonly logger = getLoggerFor(this);

  public constructor(route: AccountIdRoute, source: JsonInteractionHandler) {
    super(route, source);
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    const { target, accountId } = input;

    if (!accountId) {
      this.logger.warn(`Trying to access ${target.path} without authorization`);
      throw new UnauthorizedHttpError();
    }

    const match = this.route.matchPath(target.path)!;
    if (match.accountId !== accountId) {
      this.logger.warn(`Trying to access ${target.path} with wrong authorization: ${accountId}`);
      throw new ForbiddenHttpError();
    }

    return this.source.handle(input);
  }
}
