import { ensureTrailingSlash } from '../../../util/PathUtil';
import { ValueComputer } from './ValueComputer';

/**
 * A handler to compute base-url from args
 */
export class BaseUrlComputer extends ValueComputer {
  public async handle(args: Record<string, unknown>): Promise<unknown> {
    return typeof args.baseUrl === 'string' ? ensureTrailingSlash(args.baseUrl) : `http://localhost:${args.port}/`;
  }
}
