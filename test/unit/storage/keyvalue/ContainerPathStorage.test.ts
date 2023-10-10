import { ContainerPathStorage } from '../../../../src/storage/keyvalue/ContainerPathStorage';
import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';

describe('An ContainerPathStorage', (): void => {
  const relativePath = 'container/';
  let map: Map<string, string>;
  let source: KeyValueStorage<string, unknown>;
  let storage: ContainerPathStorage<unknown>;

  beforeEach(async(): Promise<void> => {
    map = new Map<string, string>();
    source = map as any;
    storage = new ContainerPathStorage(source, relativePath);
  });

  it('joins the input key with the relativePath to create a new key.', async(): Promise<void> => {
    const key = 'key';
    const generatedPath = `${relativePath}${key}`;
    const data = 'data';

    await expect(storage.set(key, data)).resolves.toBe(storage);
    expect(map.get(generatedPath)).toBe(data);

    await expect(storage.has(key)).resolves.toBe(true);
    await expect(storage.get(key)).resolves.toBe(data);
    await expect(storage.entries().next()).resolves.toEqual({ done: false, value: [ key, data ]});

    await expect(storage.delete(key)).resolves.toBe(true);
    expect([ ...map.keys() ]).toHaveLength(0);
  });

  it('only returns entries from the source storage matching the relative path.', async(): Promise<void> => {
    const generatedPath = `${relativePath}key`;
    const otherPath = `/otherContainer/key`;
    const data = 'data';

    map.set(generatedPath, data);
    map.set(otherPath, data);

    const results = [];
    for await (const entry of storage.entries()) {
      results.push(entry);
    }
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual([ 'key', data ]);
  });
});
