import { MemoryMapStorage } from '../../../../src/storage/keyvalue/MemoryMapStorage';

describe('A MemoryMapStorage', (): void => {
  const identifier1 = 'http://test.com/foo';
  const identifier2 = 'http://test.com/bar';
  let storage: MemoryMapStorage<string>;

  beforeEach(async(): Promise<void> => {
    storage = new MemoryMapStorage<string>();
  });

  it('returns undefined if there is no matching data.', async(): Promise<void> => {
    await expect(storage.get(identifier1)).resolves.toBeUndefined();
  });

  it('returns data if it was set beforehand.', async(): Promise<void> => {
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.get(identifier1)).resolves.toBe('apple');
    await expect(storage.entries().next()).resolves.toEqual({ done: false, value: [ identifier1, 'apple' ]});
  });

  it('can check if data is present.', async(): Promise<void> => {
    await expect(storage.has(identifier1)).resolves.toBe(false);
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(identifier1)).resolves.toBe(true);
  });

  it('can delete data.', async(): Promise<void> => {
    await expect(storage.has(identifier1)).resolves.toBe(false);
    await expect(storage.delete(identifier1)).resolves.toBe(false);
    await expect(storage.has(identifier1)).resolves.toBe(false);
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(identifier1)).resolves.toBe(true);
    await expect(storage.delete(identifier1)).resolves.toBe(true);
    await expect(storage.has(identifier1)).resolves.toBe(false);
  });

  it('can handle multiple identifiers.', async(): Promise<void> => {
    await expect(storage.set(identifier1, 'apple')).resolves.toBe(storage);
    await expect(storage.has(identifier1)).resolves.toBe(true);
    await expect(storage.has(identifier2)).resolves.toBe(false);
    await expect(storage.set(identifier2, 'pear')).resolves.toBe(storage);
    await expect(storage.get(identifier1)).resolves.toBe('apple');
  });
});
