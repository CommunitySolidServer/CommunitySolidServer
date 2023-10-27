import type { KeyValueStorage } from '../storage/keyvalue/KeyValueStorage';
import { readPackageJson } from '../util/PathUtil';
import { Initializer } from './Initializer';

/**
 * This initializer simply writes the version number of the server to the storage.
 * This will be relevant in the future when we look into migration initializers.
 *
 * It automatically parses the version number from the `package.json`.
 */
export class ModuleVersionVerifier extends Initializer {
  private readonly storageKey: string;
  private readonly storage: KeyValueStorage<string, string>;

  public constructor(storageKey: string, storage: KeyValueStorage<string, string>) {
    super();
    this.storageKey = storageKey;
    this.storage = storage;
  }

  public async handle(): Promise<void> {
    const pkg = await readPackageJson();
    await this.storage.set(this.storageKey, pkg.version as string);
  }
}
