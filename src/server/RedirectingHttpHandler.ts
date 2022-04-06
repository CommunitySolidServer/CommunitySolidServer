import type { TargetExtractor } from '../http/input/identifier/TargetExtractor';
import { RedirectResponseDescription } from '../http/output/response/RedirectResponseDescription';
import type { ResponseWriter } from '../http/output/ResponseWriter';
import { getLoggerFor } from '../logging/LogUtil';
import { FoundHttpError } from '../util/errors/FoundHttpError';
import { MovedPermanentlyHttpError } from '../util/errors/MovedPermanentlyHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { PermanentRedirectHttpError } from '../util/errors/PermanentRedirectHttpError';
import type { RedirectHttpError } from '../util/errors/RedirectHttpError';
import { SeeOtherHttpError } from '../util/errors/SeeOtherHttpError';
import { TemporaryRedirectHttpError } from '../util/errors/TemporaryRedirectHttpError';
import { getRelativeUrl, joinUrl } from '../util/PathUtil';
import type { HttpHandlerInput } from './HttpHandler';
import { HttpHandler } from './HttpHandler';
import type { HttpRequest } from './HttpRequest';

const redirectErrorFactories: Record<301 | 302 | 303 | 307 | 308, (location: string) => RedirectHttpError> = {
  301: (location: string): RedirectHttpError => new MovedPermanentlyHttpError(location),
  302: (location: string): RedirectHttpError => new FoundHttpError(location),
  303: (location: string): RedirectHttpError => new SeeOtherHttpError(location),
  307: (location: string): RedirectHttpError => new TemporaryRedirectHttpError(location),
  308: (location: string): RedirectHttpError => new PermanentRedirectHttpError(location),
};

/**
 * Handler that redirects paths matching given patterns
 * to their corresponding URL, substituting selected groups.
 */
export class RedirectingHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);
  private readonly redirects: {
    regex: RegExp;
    redirectPattern: string;
  }[];

  /**
   * Creates a handler for the provided redirects.
   * @param redirects - A mapping between URL patterns.
   */
  public constructor(
    redirects: Record<string, string>,
    private readonly baseUrl: string,
    private readonly targetExtractor: TargetExtractor,
    private readonly responseWriter: ResponseWriter,
    private readonly statusCode: 301 | 302 | 303 | 307 | 308 = 308,
  ) {
    super();

    // Create an array of (regexp, redirect) pairs
    this.redirects = Object.keys(redirects).map(
      (pattern): { regex: RegExp; redirectPattern: string } => ({
        regex: new RegExp(pattern, 'u'),
        redirectPattern: redirects[pattern],
      }),
    );
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    // Try to find redirect for target URL
    await this.findRedirect(request);
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    // Try to find redirect for target URL
    const redirect = await this.findRedirect(request);

    // Send redirect response
    this.logger.info(`Redirecting ${request.url} to ${redirect}`);
    const result = new RedirectResponseDescription(redirectErrorFactories[this.statusCode](redirect));
    await this.responseWriter.handleSafe({ response, result });
  }

  private async findRedirect(request: HttpRequest): Promise<string> {
    // Retrieve target relative to base URL
    const target = await getRelativeUrl(this.baseUrl, request, this.targetExtractor);

    // Get groups and redirect of first matching pattern
    let result;
    for (const { regex, redirectPattern } of this.redirects) {
      const match = regex.exec(target);
      if (match) {
        result = { match, redirectPattern };
        break;
      }
    }

    // Only return if a redirect is configured for the requested URL
    if (!result) {
      throw new NotImplementedHttpError(`No redirect configured for ${target}`);
    }

    // Build redirect URL from regexp result
    const { match, redirectPattern } = result;
    const redirect = match.reduce(
      (prev, param, index): string => prev.replace(`$${index}`, param),
      redirectPattern,
    );

    // Don't redirect if target is already correct
    if (redirect === target) {
      throw new NotImplementedHttpError('Target is already correct.');
    }

    return /^(?:[a-z]+:)?\/\//ui.test(redirect) ? redirect : joinUrl(this.baseUrl, redirect);
  }
}
