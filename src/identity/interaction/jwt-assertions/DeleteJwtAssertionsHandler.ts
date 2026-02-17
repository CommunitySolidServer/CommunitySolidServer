import type { EmptyObject } from '../../../util/map/MapUtil';
import { parsePath, verifyAccountId } from '../account/util/AccountUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { JwtAssertionsIdRoute } from './util/JwtAssertionsIdRoute';
import type { JwtAssertionsStore } from './util/JwtAssertionsStore';

/**
 * Handles the deletion of JWT assertions.
 */
export class DeleteJwtAssertionsHandler extends JsonInteractionHandler<EmptyObject> {
  private readonly jwtAssertionsStore: JwtAssertionsStore;
  private readonly jwtAssertionsRoute: JwtAssertionsIdRoute;

  public constructor(jwtAssertionsStore: JwtAssertionsStore, jwtAssertionsRoute: JwtAssertionsIdRoute) {
    super();
    this.jwtAssertionsStore = jwtAssertionsStore;
    this.jwtAssertionsRoute = jwtAssertionsRoute;
  }

  public async handle({ target, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const match = parsePath(this.jwtAssertionsRoute, target.path);

    const credentials = await this.jwtAssertionsStore.get(match.jwtAssertionsId);
    verifyAccountId(accountId, credentials?.accountId);

    await this.jwtAssertionsStore.delete(match.jwtAssertionsId);

    return { json: {}};
  }
}
