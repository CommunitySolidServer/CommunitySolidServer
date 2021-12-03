import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { RedirectHttpError } from '../../util/errors/RedirectHttpError';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * Catches redirect errors from the source and returns a JSON body containing a `location` field instead.
 * This allows the API to be used more easily from the browser.
 *
 * The issue is that if the API actually did a redirect,
 * this would make it unusable when using it on HTML pages that need to render errors in case the fetch fails,
 * but want to redirect the page in case it succeeds.
 * See full overview at https://github.com/solid/community-server/pull/1088.
 */
export class LocationInteractionHandler extends InteractionHandler {
  private readonly source: InteractionHandler;

  public constructor(source: InteractionHandler) {
    super();
    this.source = source;
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await this.source.canHandle(input);
  }

  public async handle(input: InteractionHandlerInput): Promise<Representation> {
    try {
      return await this.source.handle(input);
    } catch (error: unknown) {
      if (RedirectHttpError.isInstance(error)) {
        const body = JSON.stringify({ location: error.location });
        return new BasicRepresentation(body, input.operation.target, APPLICATION_JSON);
      }
      throw error;
    }
  }
}
