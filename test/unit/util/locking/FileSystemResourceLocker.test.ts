import { readdir } from 'fs-extra';
import { FileSystemResourceLocker, InternalServerError, joinFilePath } from '../../../../src';
import { getTestFolder, removeFolder } from '../../../integration/Config';

// Due to the nature of using a file locking library, this is a unit test that writes to disk.
// In the future ( = if someone has time) we might want to split this up into a unit test with a `proper-lockfile` mock,
// and an integration test that tests the behaviour of the library.
const rootFilePath = getTestFolder('FileSystemResourceLocker');
const lockFolder = joinFilePath(rootFilePath, '.internal/locks/');

describe('A FileSystemResourceLocker', (): void => {
  let locker: FileSystemResourceLocker;
  const identifier = { path: 'http://test.com/foo' };

  beforeEach(async(): Promise<void> => {
    locker = new FileSystemResourceLocker({ rootFilePath, attemptSettings: { retryCount: 19, retryDelay: 100 }});
    await locker.initialize();
  });

  afterEach(async(): Promise<void> => {
    try {
      // Release to be sure
      await locker.release(identifier);
    } catch {
      // Do nothing
    }
  });

  afterAll(async(): Promise<void> => {
    await locker.finalize();
    await removeFolder(rootFilePath);
  });

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(locker.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker.release(identifier)).resolves.toBeUndefined();
  });

  it('can lock and unlock a resource with a locker with indefinite retry.', async(): Promise<void> => {
    const locker2 = new FileSystemResourceLocker({ rootFilePath, attemptSettings: { retryCount: -1 }});
    await expect(locker2.acquire(identifier)).resolves.toBeUndefined();
    await expect(locker2.release(identifier)).resolves.toBeUndefined();
    await locker2.finalize();
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
    await expect(locker.release(identifier)).rejects.toThrow('Lock is not acquired/owned by you');
  });

  it('errors when max retries has been reached.', async(): Promise<void> => {
    await locker.acquire(identifier);
    await expect(locker.acquire(identifier)).rejects
      .toThrow(
        /Error trying to acquire lock for .*\. The operation did not succeed after the set maximum of tries \(\d+\)\./u,
      );
    await locker.release(identifier);
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
    expect(results[0]).toBe(1);
    expect(results).toContain(2);
    expect(results).toContain(3);
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

  it('throws an error when #tryFn() throws an error.', async(): Promise<void> => {
    await locker.acquire(identifier);
    await expect(locker.acquire(identifier)).rejects.toThrow(InternalServerError);
  });

  it('clears the files in de lock directory upon calling initialize.', async(): Promise<void> => {
    await locker.acquire(identifier);
    await expect(readdir(lockFolder)).resolves.toHaveLength(1);
    await locker.initialize();
    await expect(readdir(lockFolder)).resolves.toHaveLength(0);
  });

  it('stops proper-lock from throwing errors after finalize was called.', async(): Promise<void> => {
    // Tests should never access private fields so we need to change this after splitting the test as mentioned above.
    // Once we have a mock we can check which parameters `unlock` was called with and extract the function from there.
    expect((): void => (locker as any).customOnCompromised(new Error('test'))).toThrow('test');
    await locker.finalize();
    expect((locker as any).customOnCompromised(new Error('test'))).toBeUndefined();
  });
});
