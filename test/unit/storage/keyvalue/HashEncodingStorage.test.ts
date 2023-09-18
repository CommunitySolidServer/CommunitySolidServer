import { HashEncodingStorage } from '../../../../src/storage/keyvalue/HashEncodingStorage';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A HashEncodingStorage', (): void => {
  let map: Map<string, string>;
  let source: KeyValueStorage<string, string>;
  let storage: HashEncodingStorage<string>;

  beforeEach(async(): Promise<void> => {
    map = new Map<string, string>();
    source = map as any;
    storage = new HashEncodingStorage<string>(source);
  });

  it('hashes the keys.', async(): Promise<void> => {
    const key = 'key';
    const hash = '2c70e12b7a0646f92279f427c7b38e7334d8e5389cff167a1dc30e73f826b683';
    const data = 'data';
    await storage.set(key, data);
    expect(map.size).toBe(1);
    expect(map.get(hash)).toBe(data);
    await expect(storage.get(key)).resolves.toBe(data);
  });

  it('errors when paths should be converted back to keys.', async(): Promise<void> => {
    await storage.set('key', 'data');
    await expect(storage.entries().next()).rejects.toThrow(NotImplementedHttpError);
  });
});
