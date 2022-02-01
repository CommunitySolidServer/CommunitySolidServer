import { ensureTrailingSlash } from '../../../util/PathUtil';
import type { Settings } from '../Types';
import { SettingsExtractor } from './SettingsExtractor';

/**
 * A {@link SettingsExtractor} that that generates the base URL based on the input `baseUrl` value,
 * or by using the port if the first isn't provided.
 */
export class BaseUrlExtractor extends SettingsExtractor {
  private readonly defaultPort: number;

  public constructor(defaultPort = 3000) {
    super();
    this.defaultPort = defaultPort;
  }

  public async handle(args: Settings): Promise<unknown> {
    if (typeof args.baseUrl === 'string') {
      return ensureTrailingSlash(args.baseUrl);
    }
    const port = args.port ?? this.defaultPort;
    return `http://localhost:${port}/`;
  }
}
