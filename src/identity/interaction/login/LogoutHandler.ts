import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import type { EmptyObject } from '../../../util/map/MapUtil';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import type { CookieStore } from '../account/util/CookieStore';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';

/**
 * Responsible for logging a user out.
 * In practice this means just making sure the cookie is no longer valid.
 */
export class LogoutHandler extends JsonInteractionHandler<EmptyObject> {
  public readonly cookieStore: CookieStore;

  public constructor(cookieStore: CookieStore) {
    super();
    this.cookieStore = cookieStore;
  }

  public async handle({ metadata, accountId }: JsonInteractionHandlerInput): Promise<JsonRepresentation<EmptyObject>> {
    const cookie = metadata.get(SOLID_HTTP.terms.accountCookie)?.value;
    if (cookie) {
      // Make sure the cookie belongs to the logged-in user.
      const foundId = await this.cookieStore.get(cookie);
      if (foundId !== accountId) {
        throw new BadRequestHttpError('Invalid cookie.');
      }

      await this.cookieStore.delete(cookie);
    }

    return { json: {}};
  }
}
