import { resolveAssetPath } from '../../../util/PathUtil';
import type { Shorthand } from '../Types';
import { ShorthandExtractor } from './ShorthandExtractor';

/**
 * A {@link ShorthandExtractor} that converts a path value to an absolute asset path
 * by making use of `resolveAssetPath`.
 * Returns the default path in case it is defined and no path was found in the map.
 */
export class AssetPathExtractor extends ShorthandExtractor {
  private readonly key: string;
  private readonly defaultPath?: string;

  public constructor(key: string, defaultPath?: string) {
    super();
    this.key = key;
    this.defaultPath = defaultPath;
  }

  public async handle(args: Shorthand): Promise<unknown> {
    const path = args[this.key] ?? this.defaultPath;
    if (path) {
      if (typeof path !== 'string') {
        throw new TypeError(`Invalid ${this.key} argument`);
      }

      return resolveAssetPath(path);
    }

    return null;
  }
}
