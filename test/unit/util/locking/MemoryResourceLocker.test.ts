import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { MemoryResourceLocker } from '../../../../src/util/locking/MemoryResourceLocker';

describe('A MemoryResourceLocker', (): void => {
  let locker: MemoryResourceLocker;
  const identifier = { path: 'http://test.com/foo' };
  beforeEach(async(): Promise<void> => {
    locker = new MemoryResourceLocker();
  });

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
  });

  it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).rejects.toThrow(InternalServerError);
  });

  it('blocks lock acquisition until they are released.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire(identifier);
    const lock2 = locker.acquire(identifier);
    const lock3 = locker.acquire(identifier);

    // Note the different order of calls
    const prom2 = lock2.then(async(): Promise<void> => {
      results.push(2);
      return locker.release(identifier);
    });
    const prom3 = lock3.then(async(): Promise<void> => {
      results.push(3);
      return locker.release(identifier);
    });
    const prom1 = lock1.then(async(): Promise<void> => {
      results.push(1);
      return locker.release(identifier);
    });
    await Promise.all([ prom2, prom3, prom1 ]);
    expect(results).toEqual([ 1, 2, 3 ]);
  });

  it('can acquire different keys simultaneously.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: 'path1' });
    const lock2 = locker.acquire({ path: 'path2' });
    const lock3 = locker.acquire({ path: 'path3' });
    await lock2.then(async(): Promise<void> => {
      results.push(2);
      return locker.release({ path: 'path2' });
    });
    await lock3.then(async(): Promise<void> => {
      results.push(3);
      return locker.release({ path: 'path3' });
    });
    await lock1.then(async(): Promise<void> => {
      results.push(1);
      return locker.release({ path: 'path1' });
    });
    expect(results).toEqual([ 2, 3, 1 ]);
  });
});
