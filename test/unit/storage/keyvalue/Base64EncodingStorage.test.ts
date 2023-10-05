import { Base64EncodingStorage } from '../../../../src/storage/keyvalue/Base64EncodingStorage';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';

describe('A Base64EncodingStorage', (): void => {
  let map: Map<string, string>;
  let source: KeyValueStorage<string, string>;
  let storage: Base64EncodingStorage<string>;

  beforeEach(async(): Promise<void> => {
    map = new Map<string, string>();
    source = map as any;
    storage = new Base64EncodingStorage<string>(source);
  });

  it('encodes the keys.', async(): Promise<void> => {
    const key = 'key';
    // Base 64 encoding of 'key'
    const encodedKey = 'a2V5';
    const data = 'data';
    await storage.set(key, data);
    expect(map.size).toBe(1);
    expect(map.get(encodedKey)).toBe(data);
    await expect(storage.get(key)).resolves.toBe(data);
  });

  it('decodes the keys.', async(): Promise<void> => {
    // Base 64 encoding of 'key'
    const encodedKey = 'a2V5';
    const data = 'data';

    map.set(encodedKey, data);

    const results = [];
    for await (const entry of storage.entries()) {
      results.push(entry);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual([ 'key', data ]);
  });

  it('correctly handles keys that have been encoded by the source storage.', async(): Promise<void> => {
    // Base 64 encoding of 'apple'
    const encodedKey = 'YXBwbGU=';
    const data = 'data';

    map.set(encodedKey, data);

    const results = [];
    for await (const entry of storage.entries()) {
      results.push(entry);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual([ 'apple', data ]);
  });
});
