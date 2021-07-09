import urljoin from 'url-join';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { InteractionHttpHandlerInput } from '../InteractionHttpHandler';
import { InteractionHttpHandler } from '../InteractionHttpHandler';

export interface RedirectMap {
  [key: string]: string;
  default: string;
}

/**
 * An {@link InteractionHttpHandler} that redirects requests based on their prompt.
 * A list of possible prompts can be found at https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 * In case there is no prompt or there is no match in the input map,
 * the `default` redirect will be used.
 *
 * Specifically, this is used to redirect the client to the correct way to login,
 * such as a login page, or a confirmation page if a login procedure already succeeded previously.
 */
export class InitialInteractionHandler extends InteractionHttpHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly baseUrl: string;
  private readonly redirectMap: RedirectMap;

  public constructor(baseUrl: string, redirectMap: RedirectMap) {
    super();
    this.baseUrl = baseUrl;
    this.redirectMap = redirectMap;
  }

  public async handle({ request, response, provider }: InteractionHttpHandlerInput): Promise<void> {
    // Find the matching redirect in the map or take the default
    const interactionDetails = await provider.interactionDetails(request, response);
    const name = interactionDetails.prompt.name in this.redirectMap ? interactionDetails.prompt.name : 'default';

    // Create a valid redirect URL
    const location = urljoin(this.baseUrl, this.redirectMap[name]);
    this.logger.debug(`Redirecting ${name} prompt to ${location}.`);

    // Redirect to the result
    response.writeHead(302, { location });
    response.end();
  }
}
