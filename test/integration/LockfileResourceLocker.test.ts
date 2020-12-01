import { mkdirSync } from 'fs';
import * as rimraf from 'rimraf';
import { FixedContentTypeMapper } from '../../src/storage/mapping/FixedContentTypeMapper';
import { LockfileResourceLocker } from '../../src/util/locking/LockfileResourceLocker';
import { getRootFilePath } from '../configs/Util';

describe('A LockfileResourceLocker', (): void => {
  let rootFilePath: string;
  const base = 'http://test.com/';
  let locker: LockfileResourceLocker;

  beforeAll(async(): Promise<void> => {
    rootFilePath = getRootFilePath('locks');
    mkdirSync(rootFilePath, { recursive: true });
  });

  afterAll(async(): Promise<void> => {
    rimraf.sync(rootFilePath, { glob: false });
  });

  beforeEach(async(): Promise<void> => {
    locker = new LockfileResourceLocker(new FixedContentTypeMapper(base, rootFilePath, 'internal/lock'));
  });

  it('can acquire a lock.', async(): Promise<void> => {
    const lock = await locker.acquire({ path: `${base}path` });
    expect(lock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
  });

  it('can release an acquired lock.', async(): Promise<void> => {
    const lock = await locker.acquire({ path: `${base}path1` });
    await expect(lock.release()).resolves.toBeUndefined();
  });

  it('can acquire a lock after it was released.', async(): Promise<void> => {
    let lock = await locker.acquire({ path: `${base}path2` });
    await lock.release();
    lock = await locker.acquire({ path: `${base}path2` });
    expect(lock).toEqual(expect.objectContaining({ release: expect.any(Function) }));
  });

  /* eslint-disable jest/valid-expect-in-promise */
  it('blocks lock acquisition until they are released.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.acquire({ path: `${base}path3` });
    const lock2 = locker.acquire({ path: `${base}path3` });
    const lock3 = locker.acquire({ path: `${base}path3` });

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
    const lock1 = locker.acquire({ path: `${base}path4` });
    const lock2 = locker.acquire({ path: `${base}path5` });
    const lock3 = locker.acquire({ path: `${base}path6` });
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
