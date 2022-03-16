import { getLoggerFor } from '../../../logging/LogUtil';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import { JsonInteractionHandler } from '../JsonInteractionHandler';
import type { InteractionRoute } from '../routing/InteractionRoute';

type OutType = { location: string; prompt: string };

/**
 * Redirects requests based on the OIDC Interaction prompt.
 * Errors in case no match was found.
 *
 * The reason we use this intermediate handler
 * instead of letting the OIDC library redirect directly to the correct page,
 * is because that library creates a cookie with of scope of the target page.
 * By having the library always redirect to the index page,
 * the cookie is relevant for all pages and other pages can see if we are still in an interaction.
 */
export class PromptHandler extends JsonInteractionHandler<OutType> {
  private readonly logger = getLoggerFor(this);

  private readonly promptRoutes: Record<string, InteractionRoute>;

  public constructor(promptRoutes: Record<string, InteractionRoute>) {
    super();
    this.promptRoutes = promptRoutes;
  }

  public async handle({ oidcInteraction }: JsonInteractionHandlerInput): Promise<JsonRepresentation<OutType>> {
    const prompt = oidcInteraction?.prompt.name;
    if (prompt && this.promptRoutes[prompt]) {
      const location = this.promptRoutes[prompt].getPath();
      this.logger.debug(`Current prompt is ${prompt} with URL ${location}`);
      // Not throwing redirect error since we also want to the prompt to the output json.
      return { json: { location, prompt }};
    }
    this.logger.warn(`Received unsupported prompt ${prompt}`);
    throw new BadRequestHttpError(`Unsupported prompt: ${prompt}`);
  }
}
