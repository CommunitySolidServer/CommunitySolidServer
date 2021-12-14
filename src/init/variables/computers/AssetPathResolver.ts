import { resolveAssetPath } from '../../../util/PathUtil';
import { ValueComputer } from './ValueComputer';

/**
 * This `VarComputer` resolves absolute path of asset, from path specified in specified argument.
 * It follows conventions of `resolveAssetPath`  function for path resolution.
 */
export class AssetPathResolver extends ValueComputer {
  private readonly key: string;
  private readonly defaultPath?: string;

  public constructor(key: string, defaultPath?: string) {
    super();
    this.key = key;
    this.defaultPath = defaultPath;
  }

  public async handle(args: Record<string, unknown>): Promise<unknown> {
    const path = args[this.key] ?? this.defaultPath;
    if (typeof path !== 'string') {
      throw new Error(`Invalid ${this.key} argument`);
    }
    return resolveAssetPath(path);
  }
}
