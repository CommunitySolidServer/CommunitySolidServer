import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { HttpHandlerInput } from './HttpHandler';
import { HttpHandler } from './HttpHandler';

export class RedirectingHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);
  private readonly matcher: RegExp;
  private readonly redirects: { pattern: RegExp; redirect: string }[] = [];

  /**
   * Creates a handler for the provided redirects.
   * @param redirects - A mapping between URL patterns.
   */
  public constructor(redirects: Record<string, string>, private readonly statusCode: number = 308) {
    super();
    const patterns = Object.keys(redirects);

    // Create a single regexp for quick checks
    this.matcher = new RegExp(`^${patterns.join('|')}$`, 'u');

    // Create an array of (regexp, redirect) pairs
    this.redirects = patterns.map(
      (pattern): { pattern: RegExp; redirect: string } => ({
        pattern: new RegExp(pattern, 'u'),
        redirect: redirects[pattern],
      }),
    );
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    // Only return if a redirect is configured for the requested URL
    if (!this.matcher.test(request.url ?? '')) {
      throw new NotImplementedHttpError(`No redirect configured for ${request.url}`);
    }
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const { url } = request;

    // Get groups and redirect of first matching pattern
    const result = this.redirects.reduce<{ match: RegExpExecArray; redirect: string } | null>(
      (prev, { pattern, redirect }): { match: RegExpExecArray; redirect: string } | null => {
        if (prev) {
          return prev;
        }
        const match = pattern.exec(url ?? '');
        if (match) {
          return { match, redirect };
        }
        return null;
      },
      null,
    );

    // Only return if a redirect is configured for the requested URL
    if (!result) {
      throw new NotImplementedHttpError(`No redirect configured for ${url}`);
    }

    // Build redirect URL from regexp result
    const { match, redirect } = result;
    const redirectUrl = match.reduce((prev, param, index): string => prev.replace(`$${index}`, param), redirect);

    // Send redirect response
    this.logger.info(`Redirecting ${url} to ${redirectUrl}`);
    response.writeHead(this.statusCode, { location: redirectUrl });
    response.end();
  }
}
