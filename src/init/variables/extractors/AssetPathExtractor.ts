import { resolveAssetPath } from '../../../util/PathUtil';
import type { Settings } from '../Types';
import { SettingsExtractor } from './SettingsExtractor';

/**
 * A {@link SettingsExtractor} that converts a path value to an absolute asset path by making use of `resolveAssetPath`.
 * Returns the default path in case it is defined and no path was found in the map.
 */
export class AssetPathExtractor extends SettingsExtractor {
  private readonly key: string;
  private readonly defaultPath?: string;

  public constructor(key: string, defaultPath?: string) {
    super();
    this.key = key;
    this.defaultPath = defaultPath;
  }

  public async handle(args: Settings): Promise<unknown> {
    const path = args[this.key] ?? this.defaultPath;
    if (typeof path !== 'string') {
      throw new Error(`Invalid ${this.key} argument`);
    }
    return resolveAssetPath(path);
  }
}
