import { EqualReadWriteLocker } from '../../../../src/util/locking/EqualReadWriteLocker';
import type { ResourceLocker } from '../../../../src/util/locking/ResourceLocker';

describe('An EqualReadWriteLocker', (): void => {
  let sourceLocker: ResourceLocker;
  let locker: EqualReadWriteLocker;
  let emptyFn: () => void;
  const identifier = { path: 'http://test.com/res' };

  beforeEach(async(): Promise<void> => {
    emptyFn = jest.fn();

    sourceLocker = {
      acquire: jest.fn(),
      release: jest.fn(),
    };
    locker = new EqualReadWriteLocker(sourceLocker);
  });

  it('locks and unlocks a resource for a read lock.', async(): Promise<void> => {
    const prom = locker.withReadLock(identifier, emptyFn);
    expect(sourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(sourceLocker.acquire).toHaveBeenLastCalledWith(identifier);
    expect(emptyFn).toHaveBeenCalledTimes(0);
    expect(sourceLocker.release).toHaveBeenCalledTimes(0);

    await expect(prom).resolves.toBeUndefined();
    expect(sourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(emptyFn).toHaveBeenCalledTimes(1);
    expect(sourceLocker.release).toHaveBeenCalledTimes(1);
    expect(sourceLocker.release).toHaveBeenLastCalledWith(identifier);
  });

  it('locks and unlocks a resource for a write lock.', async(): Promise<void> => {
    const prom = locker.withWriteLock(identifier, emptyFn);
    expect(sourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(sourceLocker.acquire).toHaveBeenLastCalledWith(identifier);
    expect(emptyFn).toHaveBeenCalledTimes(0);
    expect(sourceLocker.release).toHaveBeenCalledTimes(0);

    await expect(prom).resolves.toBeUndefined();
    expect(sourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(emptyFn).toHaveBeenCalledTimes(1);
    expect(sourceLocker.release).toHaveBeenCalledTimes(1);
    expect(sourceLocker.release).toHaveBeenLastCalledWith(identifier);
  });

  it('unlocks correctly if the whileLocked function errors.', async(): Promise<void> => {
    emptyFn = jest.fn().mockRejectedValue(new Error('bad data!'));
    const prom = locker.withWriteLock(identifier, emptyFn);
    expect(sourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(sourceLocker.acquire).toHaveBeenLastCalledWith(identifier);
    expect(emptyFn).toHaveBeenCalledTimes(0);
    expect(sourceLocker.release).toHaveBeenCalledTimes(0);

    await expect(prom).rejects.toThrow('bad data!');
    expect(sourceLocker.acquire).toHaveBeenCalledTimes(1);
    expect(emptyFn).toHaveBeenCalledTimes(1);
    expect(sourceLocker.release).toHaveBeenCalledTimes(1);
    expect(sourceLocker.release).toHaveBeenLastCalledWith(identifier);
  });
});
