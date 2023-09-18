import type { KeyValueStorage } from './KeyValueStorage';
import { PassthroughKeyValueStorage } from './PassthroughKeyValueStorage';

/**
 * Encodes the input key with base64 encoding,
 * to make sure there are no invalid or special path characters.
 */
export class Base64EncodingStorage<T> extends PassthroughKeyValueStorage<T> {
  public constructor(source: KeyValueStorage<string, T>) {
    super(source);
  }

  protected toNewKey(key: string): string {
    return Buffer.from(key).toString('base64');
  }

  protected toOriginalKey(key: string): string {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
}
