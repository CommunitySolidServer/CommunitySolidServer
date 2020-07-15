import { SingleThreadedResourceLocker } from '../../../src/storage/SingleThreadedResourceLocker';

describe('A SingleThreadedResourceLocker', (): void => {
  let locker: SingleThreadedResourceLocker;
  beforeEach(async(): Promise<void> => {
    locker = new SingleThreadedResourceLocker();
  });

  it('can acquire a lock.', async(): Promise<void> => {
    const lock = await locker.acquire({ path: 'path' });
    expect(lock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
  });

  it('can release an acquired lock.', async(): Promise<void> => {
    const lock = await locker.acquire({ path: 'path' });
    await expect(lock.release()).resolves.toBeUndefined();
  });

  it('can acquire a lock after it was released.', async(): Promise<void> => {
    let lock = await locker.acquire({ path: 'path' });
    await lock.release();
    lock = await locker.acquire({ path: 'path' });
    expect(lock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
  });

  it('blocks lock acquisition until they are released.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: 'path' });
    const lock2 = locker.acquire({ path: 'path' });
    const lock3 = locker.acquire({ path: 'path' });

    // Note the different order of calls
    const prom2 = lock2.then(async(lock): Promise<void> => {
      results.push(2);
      return lock.release();
    });
    const prom3 = lock3.then(async(lock): Promise<void> => {
      results.push(3);
      return lock.release();
    });
    const prom1 = lock1.then(async(lock): Promise<void> => {
      results.push(1);
      return lock.release();
    });
    await Promise.all([ prom2, prom3, prom1 ]);
    expect(results).toEqual([ 1, 2, 3 ]);
  });

  it('can acquire different keys simultaneously.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: 'path1' });
    const lock2 = locker.acquire({ path: 'path2' });
    const lock3 = locker.acquire({ path: 'path3' });
    await lock2.then(async(lock): Promise<void> => {
      results.push(2);
      return lock.release();
    });
    await lock3.then(async(lock): Promise<void> => {
      results.push(3);
      return lock.release();
    });
    await lock1.then(async(lock): Promise<void> => {
      results.push(1);
      return lock.release();
    });
    expect(results).toEqual([ 2, 3, 1 ]);
  });
});
