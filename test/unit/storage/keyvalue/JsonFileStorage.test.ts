import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { JsonFileStorage } from '../../../../src/storage/keyvalue/JsonFileStorage';
import type { ReadWriteLocker } from '../../../../src/util/locking/ReadWriteLocker';
import { mockFileSystem } from '../../../util/Util';

jest.mock('node:fs');
jest.mock('fs-extra');

describe('A JsonFileStorage', (): void => {
  const rootFilePath = 'files/';
  const jsonPath = 'storage.json';
  let cache: { data: any };
  let locker: ReadWriteLocker;
  let storage: JsonFileStorage;

  beforeEach(async(): Promise<void> => {
    cache = mockFileSystem(rootFilePath);
    locker = {
      withReadLock:
        jest.fn(async(identifier: ResourceIdentifier, whileLocked: () => any): Promise<any> => whileLocked()),
      withWriteLock:
        jest.fn(async(identifier: ResourceIdentifier, whileLocked: () => any): Promise<any> => whileLocked()),
    };
    storage = new JsonFileStorage(`${rootFilePath}${jsonPath}`, locker);
  });

  it('can read and write data.', async(): Promise<void> => {
    const key = 'apple';
    const value = { taste: 'sweet' };
    await expect(storage.get(key)).resolves.toBeUndefined();
    await expect(storage.has(key)).resolves.toBe(false);
    await expect(storage.delete(key)).resolves.toBe(false);
    await expect(storage.set(key, value)).resolves.toBe(storage);
    await expect(storage.get(key)).resolves.toEqual(value);
    await expect(storage.has(key)).resolves.toBe(true);
    expect(JSON.parse(cache.data[jsonPath])).toEqual({ apple: value });

    const key2 = 'lemon';
    const value2 = { taste: 'sour' };
    await expect(storage.set(key2, value2)).resolves.toBe(storage);
    await expect(storage.get(key2)).resolves.toEqual(value2);
    await expect(storage.has(key2)).resolves.toBe(true);
    expect(JSON.parse(cache.data[jsonPath])).toEqual({ apple: value, lemon: value2 });

    const json = JSON.parse(cache.data[jsonPath]);
    for await (const entry of storage.entries()) {
      expect(json[entry[0]]).toEqual(entry[1]);
    }

    await expect(storage.delete(key)).resolves.toBe(true);
    expect(JSON.parse(cache.data[jsonPath])).toEqual({ lemon: value2 });
  });

  it('throws an error if something goes wrong reading the JSON.', async(): Promise<void> => {
    cache.data[jsonPath] = '} very invalid {';
    await expect(storage.get('anything')).rejects.toThrow(Error);
  });
});
