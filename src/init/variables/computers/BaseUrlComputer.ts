import { ensureTrailingSlash } from '../../../util/PathUtil';
import { VarComputer } from '../VarComputer';

/**
 * A handler to compute base-url from args
 */
export class BaseUrlComputer extends VarComputer {
  public async handle(args: Record<string, unknown>): Promise<unknown> {
    return typeof args.baseUrl === 'string' ? ensureTrailingSlash(args.baseUrl) : `http://localhost:${args.port}/`;
  }
}
