import type yargs from 'yargs';
import { ensureTrailingSlash } from '../../..';
import { VarComputer } from '../VarComputer';

/**
 * A handler to compute base-url from args
 */
export class BaseUrlComputer extends VarComputer {
  public async handle(args: yargs.Arguments): Promise<unknown> {
    return args.baseUrl ? ensureTrailingSlash(args.baseUrl as string) : `http://localhost:${args.port}/`;
  }
}
