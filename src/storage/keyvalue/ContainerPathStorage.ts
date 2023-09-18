import { ensureTrailingSlash, joinUrl } from '../../util/PathUtil';
import type { KeyValueStorage } from './KeyValueStorage';
import { PassthroughKeyValueStorage } from './PassthroughKeyValueStorage';

/**
 * A {@link KeyValueStorage} that prepends a relative path to the key.
 */
export class ContainerPathStorage<T> extends PassthroughKeyValueStorage<T> {
  protected readonly basePath: string;

  public constructor(source: KeyValueStorage<string, T>, relativePath: string) {
    super(source);
    this.basePath = ensureTrailingSlash(relativePath);
  }

  public async* entries(): AsyncIterableIterator<[string, T]> {
    for await (const [ key, value ] of this.source.entries()) {
      // The only relevant entries for this storage are those that start with the base path
      if (!key.startsWith(this.basePath)) {
        continue;
      }
      yield [ this.toOriginalKey(key), value ];
    }
  }

  protected toNewKey(key: string): string {
    return joinUrl(this.basePath, key);
  }

  protected toOriginalKey(path: string): string {
    return path.slice(this.basePath.length);
  }
}
