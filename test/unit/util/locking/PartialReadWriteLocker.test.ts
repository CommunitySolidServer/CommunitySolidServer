import { PartialReadWriteLocker } from '../../../../src/util/locking/PartialReadWriteLocker';
import type { ResourceLocker } from '../../../../src/util/locking/ResourceLocker';

describe('A PartialReadWriteLocker', (): void => {
  let resourceLocker: jest.Mocked<ResourceLocker>;
  const resourceId = { path: 'http://test.com/resource' };
  let locker: PartialReadWriteLocker;

  beforeEach(async(): Promise<void> => {
    resourceLocker = {
      acquire: jest.fn(),
      release: jest.fn(),
    };

    locker = new PartialReadWriteLocker(resourceLocker);
  });

  it('can lock resources.', async(): Promise<void> => {
    await expect(locker.withReadLock(resourceId, (): number => 5)).resolves.toBe(5);
    expect(resourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(resourceLocker.acquire).toHaveBeenLastCalledWith(resourceId);
    expect(resourceLocker.release).toHaveBeenCalledTimes(1);
    expect(resourceLocker.release).toHaveBeenLastCalledWith(resourceId);
  });
});
