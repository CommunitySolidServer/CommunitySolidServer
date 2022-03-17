import { EncodingPathStorage } from '../../../../src/storage/keyvalue/EncodingPathStorage';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';

describe('An EncodingPathStorage', (): void => {
  const relativePath = '/container/';
  let map: Map<string, string>;
  let source: KeyValueStorage<string, unknown>;
  let storage: EncodingPathStorage<unknown>;

  beforeEach(async(): Promise<void> => {
    map = new Map<string, string>();
    source = map as any;
    storage = new EncodingPathStorage(relativePath, source);
  });

  it('encodes the input key and joins it with the relativePath to create a new key.', async(): Promise<void> => {
    const key = 'key';
    // Base 64 encoding of 'key'
    const encodedKey = 'a2V5';
    const generatedPath = `${relativePath}${encodedKey}`;
    const data = 'data';

    await expect(storage.set(key, data)).resolves.toBe(storage);
    expect(map.get(generatedPath)).toBe(data);

    await expect(storage.has(key)).resolves.toBe(true);
    await expect(storage.get(key)).resolves.toBe(data);
    await expect(storage.entries().next()).resolves.toEqual({ done: false, value: [ key, data ]});

    await expect(storage.delete(key)).resolves.toBe(true);
    expect([ ...map.keys() ]).toHaveLength(0);
  });
});
