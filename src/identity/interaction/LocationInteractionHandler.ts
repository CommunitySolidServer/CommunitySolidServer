import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import { APPLICATION_JSON } from '../../util/ContentTypes';
import { RedirectHttpError } from '../../util/errors/RedirectHttpError';
import type { InteractionHandlerInput } from './InteractionHandler';
import { InteractionHandler } from './InteractionHandler';

/**
 * Transforms an HTTP redirect into a hypermedia document with a redirection link,
 * such that scripts running in a browser can redirect the user to the next page.
 *
 * This handler addresses the situation where:
 * - the user visits a first page
 * - this first page contains a script that performs interactions with a JSON API
 * - as a result of a certain interaction, the user needs to be redirected to a second page
 *
 * Regular HTTP redirects are performed via responses with 3xx status codes.
 * However, since the consumer of the API in this case is a browser script,
 * a 3xx response would only reach that script and not move the page for the user.
 *
 * Therefore, this handler changes a 3xx response into a 200 response
 * with an explicit link to the next page,
 * enabling the script to move the user to the next page.
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
