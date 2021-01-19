import { SingleThreadedResourceLocker } from '../../../../src/util/locking/SingleThreadedResourceLocker';

describe('A SingleThreadedResourceLocker', (): void => {
  let locker: SingleThreadedResourceLocker;
  const identifier = { path: 'path' };
  let syncCb: () => string;
  let asyncCb: () => Promise<string>;
  beforeEach(async(): Promise<void> => {
    locker = new SingleThreadedResourceLocker();
    syncCb = jest.fn((): string => 'sync');
    asyncCb = jest.fn(async(): Promise<string> => new Promise((resolve): void => {
      setImmediate((): void => resolve('async'));
    }));
  });

  it('can run simple functions with a read lock.', async(): Promise<void> => {
    let prom = locker.withReadLock(identifier, syncCb);
    await expect(prom).resolves.toBe('sync');
    expect(syncCb).toHaveBeenCalledTimes(1);

    prom = locker.withReadLock(identifier, asyncCb);
    await expect(prom).resolves.toBe('async');
    expect(asyncCb).toHaveBeenCalledTimes(1);
  });

  it('can run simple functions with a write lock.', async(): Promise<void> => {
    let prom = locker.withWriteLock(identifier, syncCb);
    await expect(prom).resolves.toBe('sync');
    expect(syncCb).toHaveBeenCalledTimes(1);

    prom = locker.withWriteLock(identifier, asyncCb);
    await expect(prom).resolves.toBe('async');
    expect(asyncCb).toHaveBeenCalledTimes(1);
  });

  it('blocks lock acquisition until they are released.', async(): Promise<void> => {
    const results: number[] = [];

    const promSlow = locker.withWriteLock(identifier, async(): Promise<void> =>
      new Promise((resolve): void => {
        setImmediate((): void => {
          results.push(1);
          resolve();
        });
      }));

    const promFast = locker.withWriteLock(identifier, (): void => {
      results.push(2);
    });

    await Promise.all([ promFast, promSlow ]);
    expect(results).toEqual([ 1, 2 ]);
  });

  it('propagates errors.', async(): Promise<void> => {
    asyncCb = jest.fn(async(): Promise<string> => new Promise((resolve, reject): void => {
      setImmediate((): void => reject(new Error('test')));
    }));
    const prom = locker.withReadLock(identifier, asyncCb);
    await expect(prom).rejects.toThrow('test');
  });
});
