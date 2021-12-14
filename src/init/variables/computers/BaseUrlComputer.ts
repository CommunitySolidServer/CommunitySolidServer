import { ensureTrailingSlash } from '../../../util/PathUtil';
import { ValueComputer } from './ValueComputer';

/**
 * A handler to compute base-url from args
 */
export class BaseUrlComputer extends ValueComputer {
  private readonly defaultPort: number;

  public constructor(defaultPort = 3000) {
    super();
    this.defaultPort = defaultPort;
  }

  public async handle(args: Record<string, unknown>): Promise<unknown> {
    if (typeof args.baseUrl === 'string') {
      return ensureTrailingSlash(args.baseUrl);
    }
    const port = args.port ?? this.defaultPort;
    return `http://localhost:${port}/`;
  }
}
