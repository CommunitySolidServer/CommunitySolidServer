import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { ensureTrailingSlash, trimTrailingSlashes } from '../util/PathUtil';
import type { Authorization } from './Authorization';
import type { AuthorizerInput } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * Redirects requests to specific authorizers based on their identifier.
 * The keys in the input map will be converted to regular expressions.
 * The regular expressions should all start with a slash
 * and will be evaluated relative to the base URL.
 *
 * Will error if no match is found.
 */
export class PathBasedAuthorizer extends Authorizer {
  private readonly baseUrl: string;
  private readonly paths: Map<RegExp, Authorizer>;

  public constructor(baseUrl: string, paths: Record<string, Authorizer>) {
    super();
    this.baseUrl = ensureTrailingSlash(baseUrl);
    const entries = Object.entries(paths).map(([ key, val ]): [RegExp, Authorizer] => [ new RegExp(key, 'u'), val ]);
    this.paths = new Map(entries);
  }

  public async canHandle(input: AuthorizerInput): Promise<void> {
    const authorizer = this.findAuthorizer(input.identifier.path);
    await authorizer.canHandle(input);
  }

  public async handle(input: AuthorizerInput): Promise<Authorization> {
    const authorizer = this.findAuthorizer(input.identifier.path);
    return authorizer.handle(input);
  }

  /**
   * Find the authorizer corresponding to the given path.
   * Errors if there is no match.
   */
  private findAuthorizer(path: string): Authorizer {
    if (path.startsWith(this.baseUrl)) {
      // We want to keep the leading slash
      const relative = path.slice(trimTrailingSlashes(this.baseUrl).length);
      for (const [ regex, authorizer ] of this.paths) {
        if (regex.test(relative)) {
          return authorizer;
        }
      }
    }
    throw new NotImplementedHttpError('No regex matches the given path.');
  }
}
