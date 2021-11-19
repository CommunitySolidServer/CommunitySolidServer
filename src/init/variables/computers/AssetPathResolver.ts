import type yargs from 'yargs';
import { resolveAssetPath } from '../../..';
import { VarComputer } from '../VarComputer';

export class AssetPathResolver extends VarComputer {
  private readonly pathArgKey: string;

  public constructor(pathArgKey: string) {
    super();
    this.pathArgKey = pathArgKey;
  }

  public async handle(args: yargs.Arguments): Promise<unknown> {
    const path = args[this.pathArgKey];
    if (typeof path !== 'string') {
      throw new Error(`Invalid ${this.pathArgKey} argument`);
    }
    return resolveAssetPath(path);
  }
}
