import { EventEmitter } from 'events';
import { watch } from 'fs';
import { lock } from 'proper-lockfile';
import { FixedContentTypeMapper } from '../../../../src/storage/mapping/FixedContentTypeMapper';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { LockfileResourceLocker } from '../../../../src/util/locking/LockfileResourceLocker';

jest.mock('proper-lockfile');
jest.mock('fs');

describe('A LockfileResourceLocker', (): void => {
  let order: string[];
  let locks: string[];

  const base = 'http://test.com/';
  let locker: LockfileResourceLocker;
  let watcher: EventEmitter;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    order = [];
    locks = [];

    watcher = new EventEmitter();
    (watch as jest.Mock).mockReturnValue(watcher);

    (lock as jest.Mock).mockImplementation(async(path): Promise<() => Promise<void>> => {
      if (locks.includes(path)) {
        throw new Error('Already a lock on this object.');
      } else {
        order.push('acquire');
        locks.push(path);
        const release = async(): Promise<void> => {
          await new Promise((resolve): any => {
            order.push('release');
            locks = locks.filter((element): boolean => element !== path);
            watcher.emit('change');
            resolve();
          });
        };
        return release;
      }
    });

    locker = new LockfileResourceLocker(new FixedContentTypeMapper(base, '/locks', 'internal/lock'));
  });

  it('can acquire a lock.', async(): Promise<void> => {
    const acquiredLock = await locker.acquire({ path: `${base}path` });

    expect(acquiredLock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
    expect(lock as jest.Mock).toHaveBeenCalledWith('/locks/path', { realpath: false });
    expect(lock as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('can release an acquired lock.', async(): Promise<void> => {
    const acquiredLock = await locker.acquire({ path: `${base}path` });
    await acquiredLock.release();

    expect(acquiredLock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
    expect(lock as jest.Mock).toHaveBeenCalledWith('/locks/path', { realpath: false });
    expect(lock as jest.Mock).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'release' ]);
  });

  it('can acquire a lock after it was released.', async(): Promise<void> => {
    let acquiredLock = await locker.acquire({ path: `${base}path` });
    await acquiredLock.release();

    acquiredLock = await locker.acquire({ path: `${base}path` });
    expect(acquiredLock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
    expect(lock as jest.Mock).toHaveBeenCalledWith('/locks/path', { realpath: false });
    expect(lock as jest.Mock).toHaveBeenCalledTimes(2);
    expect(order).toEqual([ 'acquire', 'release', 'acquire' ]);
  });

  /* eslint-disable jest/valid-expect-in-promise */
  it('blocks lock acquisition until they are released.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: `${base}path` });
    const lock2 = locker.acquire({ path: `${base}path` });
    const lock3 = locker.acquire({ path: `${base}path` });

    // Note the different order of calls
    const prom2 = lock2.then(async(acquiredLock): Promise<void> => {
      results.push(2);
      return acquiredLock.release();
    });
    const prom3 = lock3.then(async(acquiredLock): Promise<void> => {
      results.push(3);
      return acquiredLock.release();
    });
    const prom1 = lock1.then(async(acquiredLock): Promise<void> => {
      results.push(1);
      return acquiredLock.release();
    });
    await Promise.all([ prom2, prom3, prom1 ]);
    expect(results).toEqual([ 1, 2, 3 ]);
    expect(order).toEqual([ 'acquire', 'release', 'acquire', 'release', 'acquire', 'release' ]);
  });

  it('can acquire different keys simultaneously.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: `${base}path1` });
    const lock2 = locker.acquire({ path: `${base}path2` });
    const lock3 = locker.acquire({ path: `${base}path3` });
    await lock2.then(async(acquiredLock): Promise<void> => {
      results.push(2);
      return acquiredLock.release();
    });
    await lock3.then(async(acquiredLock): Promise<void> => {
      results.push(3);
      return acquiredLock.release();
    });
    await lock1.then(async(acquiredLock): Promise<void> => {
      results.push(1);
      return acquiredLock.release();
    });
    expect(results).toEqual([ 2, 3, 1 ]);
    expect(order).toEqual([ 'acquire', 'acquire', 'acquire', 'release', 'release', 'release' ]);
  });

  it('throws an internal error if an error occurs during the release of the lock.', async(): Promise<void> => {
    (lock as jest.Mock).mockImplementationOnce(async(): Promise<() => Promise<void>> => {
      const release = async(): Promise<void> => new Promise(async(resolve, reject): Promise<void> => {
        reject(new Error('Error during release!'));
      });
      return release;
    });

    await expect(async(): Promise<any> => {
      const acquiredLock = await locker.acquire({ path: `${base}path` });
      await acquiredLock.release();
    }).rejects.toThrow(InternalServerError);
  });
});
