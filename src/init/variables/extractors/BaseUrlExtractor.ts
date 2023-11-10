import { ensureTrailingSlash } from '../../../util/PathUtil';
import type { Shorthand } from '../Types';
import { ShorthandExtractor } from './ShorthandExtractor';

/**
 * A {@link ShorthandExtractor} that that generates the base URL based on the input `baseUrl` value,
 * or by using the port if the first isn't provided.
 */
export class BaseUrlExtractor extends ShorthandExtractor {
  private readonly defaultPort: number;

  public constructor(defaultPort = 3000) {
    super();
    this.defaultPort = defaultPort;
  }

  public async handle(args: Shorthand): Promise<unknown> {
    if (typeof args.baseUrl === 'string') {
      return ensureTrailingSlash(args.baseUrl);
    }
    if (typeof args.socket === 'string') {
      throw new TypeError('BaseUrl argument should be provided when using Unix Domain Sockets.');
    }
    const port = (args.port as string) ?? this.defaultPort;
    const url = new URL('http://localhost/');
    url.port = `${port}`;
    return url.href;
  }
}
