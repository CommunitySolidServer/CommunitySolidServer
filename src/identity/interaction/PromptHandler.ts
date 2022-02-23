import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../util/errors/FoundHttpError';
import { InteractionHandler } from './InteractionHandler';
import type { InteractionHandlerInput } from './InteractionHandler';
import type { InteractionRoute } from './routing/InteractionRoute';

/**
 * Redirects requests based on the OIDC Interaction prompt.
 * Errors in case no match was found.
 */
export class PromptHandler extends InteractionHandler {
  private readonly promptRoutes: Record<string, InteractionRoute>;

  public constructor(promptRoutes: Record<string, InteractionRoute>) {
    super();
    this.promptRoutes = promptRoutes;
  }

  public async handle({ oidcInteraction }: InteractionHandlerInput): Promise<never> {
    // We also want to redirect on GET so no method check is needed
    const prompt = oidcInteraction?.prompt.name;
    if (prompt && this.promptRoutes[prompt]) {
      const location = this.promptRoutes[prompt].getPath();
      throw new FoundHttpError(location);
    }
    throw new BadRequestHttpError(`Unsupported prompt: ${prompt}`);
  }
}
