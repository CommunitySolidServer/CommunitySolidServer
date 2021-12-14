import { resolveAssetPath } from '../../../util/PathUtil';
import { ValueComputer } from './ValueComputer';

/**
 * This `VarComputer` resolves absolute path of asset, from path specified in specified argument.
 * It follows conventions of `resolveAssetPath`  function for path resolution.
 */
export class AssetPathResolver extends ValueComputer {
  private readonly pathArgKey: string;

  public constructor(pathArgKey: string) {
    super();
    this.pathArgKey = pathArgKey;
  }

  public async handle(args: Record<string, unknown>): Promise<unknown> {
    const path = args[this.pathArgKey];
    if (typeof path !== 'string') {
      throw new Error(`Invalid ${this.pathArgKey} argument`);
    }
    return resolveAssetPath(path);
  }
}
