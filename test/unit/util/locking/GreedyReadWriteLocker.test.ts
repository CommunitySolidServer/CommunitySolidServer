import type { KeyValueStorage } from '../../../../src/storage/keyvalue/KeyValueStorage';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { GreedyReadWriteLocker } from '../../../../src/util/locking/GreedyReadWriteLocker';
import type { ResourceLocker } from '../../../../src/util/locking/ResourceLocker';

describe('A GreedyReadWriteLocker', (): void => {
  let resourceLocker: jest.Mocked<ResourceLocker>;
  let storageMap: Map<string, number>;
  let storage: KeyValueStorage<string, number>;
  const resourceId = { path: 'http://test.com/resource' };
  let locker: GreedyReadWriteLocker;

  beforeEach(async(): Promise<void> => {
    resourceLocker = {
      acquire: jest.fn(),
      release: jest.fn(),
    };

    storageMap = new Map<string, number>();
    storage = storageMap as any;

    locker = new GreedyReadWriteLocker(resourceLocker, storage);
  });

  it('deletes count resources once locking is finished.', async(): Promise<void> => {
    await expect(locker.withReadLock(resourceId, (): number => 5)).resolves.toBe(5);
    expect(storageMap.size).toBe(0);
    expect(resourceLocker.acquire).toHaveBeenCalledTimes(3);
    expect(resourceLocker.acquire).toHaveBeenNthCalledWith(1, { path: `${resourceId.path}.read` });
    expect(resourceLocker.acquire).toHaveBeenNthCalledWith(2, resourceId);
    expect(resourceLocker.acquire).toHaveBeenNthCalledWith(3, { path: `${resourceId.path}.read` });
    expect(resourceLocker.release).toHaveBeenCalledTimes(3);
    expect(resourceLocker.release).toHaveBeenNthCalledWith(1, { path: `${resourceId.path}.read` });
    expect(resourceLocker.release).toHaveBeenNthCalledWith(2, resourceId);
    expect(resourceLocker.release).toHaveBeenNthCalledWith(3, { path: `${resourceId.path}.read` });
  });

  it('errors if the read counter has an unexpected value.', async(): Promise<void> => {
    jest.spyOn(storage, 'get').mockResolvedValue(0);
    await expect(locker.withReadLock(resourceId, (): number => 5)).rejects.toThrow(InternalServerError);
  });
});
