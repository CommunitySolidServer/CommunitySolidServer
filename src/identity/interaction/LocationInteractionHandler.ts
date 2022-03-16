import { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import { getLoggerFor } from '../../logging/LogUtil';
import { RedirectHttpError } from '../../util/errors/RedirectHttpError';
import { SOLID_HTTP } from '../../util/Vocabularies';
import type { JsonRepresentation } from './InteractionUtil';
import type { JsonInteractionHandlerInput } from './JsonInteractionHandler';
import { JsonInteractionHandler } from './JsonInteractionHandler';

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
export class LocationInteractionHandler extends JsonInteractionHandler {
  private readonly logger = getLoggerFor(this);

  private readonly source: JsonInteractionHandler;

  public constructor(source: JsonInteractionHandler) {
    super();
    this.source = source;
  }

  public async canHandle(input: JsonInteractionHandlerInput): Promise<void> {
    await this.source.canHandle(input);
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    try {
      return await this.source.handle(input);
    } catch (error: unknown) {
      if (RedirectHttpError.isInstance(error)) {
        this.logger.debug(`Converting redirect error to location field in JSON body with location ${error.location}`);
        const metadata = new RepresentationMetadata(input.target);
        metadata.set(SOLID_HTTP.terms.location, error.location);
        return { json: { location: error.location }, metadata };
      }
      throw error;
    }
  }
}
