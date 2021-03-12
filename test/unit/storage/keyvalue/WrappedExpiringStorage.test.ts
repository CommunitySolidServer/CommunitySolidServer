import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import type { Expires } from '../../../../src/storage/keyvalue/WrappedExpiringStorage';
import { WrappedExpiringStorage } from '../../../../src/storage/keyvalue/WrappedExpiringStorage';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';

type Internal = Expires<string>;

function createExpires(payload: string, expires?: Date): Internal {
  return { payload, expires: expires?.toISOString() };
}

describe('A WrappedExpiringStorage', (): void => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let source: KeyValueStorage<string, Internal>;
  let storage: WrappedExpiringStorage<string, string>;

  beforeEach(async(): Promise<void> => {
    source = {
      get: jest.fn(),
      has: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      entries: jest.fn(),
    };
    storage = new WrappedExpiringStorage(source);
  });

  it('does not return data if there is no result.', async(): Promise<void> => {
    await expect(storage.get('key')).resolves.toBeUndefined();
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith('key');
  });

  it('returns data if it has not expired.', async(): Promise<void> => {
    (source.get as jest.Mock).mockResolvedValueOnce(createExpires('data!', tomorrow));
    await expect(storage.get('key')).resolves.toEqual('data!');
  });

  it('deletes expired data when trying to get it.', async(): Promise<void> => {
    (source.get as jest.Mock).mockResolvedValueOnce(createExpires('data!', yesterday));
    await expect(storage.get('key')).resolves.toBeUndefined();
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith('key');
  });

  it('returns false on `has` checks if there is no data.', async(): Promise<void> => {
    await expect(storage.has('key')).resolves.toBe(false);
    expect(source.get).toHaveBeenCalledTimes(1);
    expect(source.get).toHaveBeenLastCalledWith('key');
  });

  it('true on `has` checks if there is non-expired data.', async(): Promise<void> => {
    (source.get as jest.Mock).mockResolvedValueOnce(createExpires('data!', tomorrow));
    await expect(storage.has('key')).resolves.toBe(true);
  });

  it('deletes expired data when checking if it exists.', async(): Promise<void> => {
    (source.get as jest.Mock).mockResolvedValueOnce(createExpires('data!', yesterday));
    await expect(storage.has('key')).resolves.toBe(false);
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith('key');
  });

  it('converts the expiry date to a string when storing data.', async(): Promise<void> => {
    await storage.set('key', 'data!', tomorrow);
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(source.set).toHaveBeenLastCalledWith('key', createExpires('data!', tomorrow));
  });

  it('can store data without expiry date.', async(): Promise<void> => {
    await storage.set('key', 'data!');
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(source.set).toHaveBeenLastCalledWith('key', createExpires('data!'));
  });

  it('errors when trying to store expired data.', async(): Promise<void> => {
    await expect(storage.set('key', 'data!', yesterday)).rejects.toThrow(InternalServerError);
  });

  it('directly calls delete on the source when deleting.', async(): Promise<void> => {
    await expect(storage.delete('key')).resolves.toBeUndefined();
    expect(source.delete).toHaveBeenCalledTimes(1);
    expect(source.delete).toHaveBeenLastCalledWith('key');
  });

  it('only iterates over non-expired entries.', async(): Promise<void> => {
    const data = [
      [ 'key1', createExpires('data1', tomorrow) ],
      [ 'key2', createExpires('data2', yesterday) ],
      [ 'key3', createExpires('data3') ],
    ];
    (source.entries as jest.Mock).mockImplementationOnce(function* (): any {
      yield* data;
    });
    const it = storage.entries();
    await expect(it.next()).resolves.toEqual(
      expect.objectContaining({ value: [ 'key1', 'data1' ]}),
    );
    await expect(it.next()).resolves.toEqual(
      expect.objectContaining({ value: [ 'key3', 'data3' ]}),
    );
  });
});
