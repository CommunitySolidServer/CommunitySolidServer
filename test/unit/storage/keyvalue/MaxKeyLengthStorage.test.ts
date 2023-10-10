import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { MaxKeyLengthStorage } from '../../../../src/storage/keyvalue/MaxKeyLengthStorage';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A MaxKeyLengthStorage', (): void => {
  const key = 'key';
  const longKey = 'thisisaverylongkeythatismorecharactersthansupportedbythestoragewhichallowsus' +
    'tocheckifthehashtriggeractuallyoccursinthecasesthatarenecessarybutnotintheothercasesasthatwouldcauseissues';
  const hash = '10a298fdb8f50bf0ddef6aac982c54f5613c357f897ab954daee498c60c6cad2';
  const hashedKey = `$hash$${hash}`;
  const payload = 'data';
  let source: jest.Mocked<KeyValueStorage<string, any>>;
  let storage: MaxKeyLengthStorage<string>;

  beforeEach(async(): Promise<void> => {
    const entries = [
      [ key, { key, payload }],
      [ hashedKey, { key: longKey, payload }],
    ];

    source = {
      has: jest.fn().mockResolvedValue(false),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn().mockResolvedValue(false),
      entries: jest.fn(async function* (): AsyncIterableIterator<any> {
        yield* entries;
      }),
    };

    storage = new MaxKeyLengthStorage(source);
  });

  it('checks the source for existence.', async(): Promise<void> => {
    await expect(storage.has(key)).resolves.toBe(false);
    expect(source.has).toHaveBeenCalledTimes(1);
    expect(source.has).toHaveBeenLastCalledWith(key);
    await expect(storage.has(longKey)).resolves.toBe(false);
    expect(source.has).toHaveBeenCalledTimes(2);
    expect(source.has).toHaveBeenLastCalledWith(hashedKey);
  });

  it('checks the source for data.', async(): Promise<void> => {
    await expect(storage.get(key)).resolves.toBeUndefined();
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith(key);
    await expect(storage.get(longKey)).resolves.toBeUndefined();
    expect(source.get).toHaveBeenCalledTimes(2);
    expect(source.get).toHaveBeenLastCalledWith(hashedKey);
  });

  it('wraps data before writing it to the source.', async(): Promise<void> => {
    await expect(storage.set(key, payload)).resolves.toBe(storage);
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(source.set).toHaveBeenLastCalledWith(key, { key, payload });
    await expect(storage.set(longKey, payload)).resolves.toBe(storage);
    expect(source.set).toHaveBeenCalledTimes(2);
    expect(source.set).toHaveBeenLastCalledWith(hashedKey, { key: longKey, payload });
  });

  it('calls the source to delete entries.', async(): Promise<void> => {
    await expect(storage.delete(key)).resolves.toBe(false);
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith(key);
    await expect(storage.delete(longKey)).resolves.toBe(false);
    expect(source.delete).toHaveBeenCalledTimes(2);
    expect(source.delete).toHaveBeenLastCalledWith(hashedKey);
  });

  it('returns the correct entries.', async(): Promise<void> => {
    const entries = [];
    for await (const entry of storage.entries()) {
      entries.push(entry);
    }
    expect(entries).toEqual([
      [ key, payload ],
      [ longKey, payload ],
    ]);
  });

  it('errors trying to write with a key that has the hash prefix.', async(): Promise<void> => {
    await expect(storage.set(`$hash$key`, payload)).rejects.toThrow(NotImplementedHttpError);
  });
});
