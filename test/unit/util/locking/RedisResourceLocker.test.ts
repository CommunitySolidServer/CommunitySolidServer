import { InternalServerError } from '../../../../src/util/errors/InternalServerError';

describe('A RedisResourceLocker', (): void => {
  let mocker: any;
  let helperMap: Map<string, string>;
  const identifier = { path: 'http://test.com/foo' };
  beforeEach(async(): Promise<void> => {
    helperMap = new Map();
    const mockFn = jest.fn();
    mocker = jest.fn().mockImplementation((): any => ({ locker: mockFn }));
    mocker.acquire = jest.fn().mockImplementation(
      async(identif: { path: string}): Promise<void> => new Promise<void>((resolve): void => {
        helperMap.set(identif.path, 'mockLock');
        resolve();
      }),
    );
    mocker.release = jest.fn().mockImplementation(
      async(identif: { path: string}): Promise<void> => new Promise<void>((resolve): void => {
        if (helperMap.get(identif.path)) {
          helperMap.delete(identif.path);
          resolve();
        } else {
          throw new InternalServerError('Cant release a lock for a resource that is not locked');
        }
      }),
    );
  });

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(mocker.acquire(identifier)).resolves.toBeUndefined();
    await expect(mocker.release(identifier)).resolves.toBeUndefined();
  });

  it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
    await expect(mocker.acquire(identifier)).resolves.toBeUndefined();
    await expect(mocker.release(identifier)).resolves.toBeUndefined();
    await expect(mocker.acquire(identifier)).resolves.toBeUndefined();
  });

  it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
    await expect(mocker.acquire(identifier)).resolves.toBeUndefined();
    await expect(mocker.release(identifier)).resolves.toBeUndefined();
    await expect(mocker.release(identifier)).rejects.toThrow(InternalServerError);
  });

  it('can acquire different keys simultaneously.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = mocker.acquire({ path: 'path1' });
    const lock2 = mocker.acquire({ path: 'path2' });
    const lock3 = mocker.acquire({ path: 'path3' });
    await lock2.then(async(): Promise<void> => {
      results.push(2);
      return mocker.release({ path: 'path2' });
    });
    await lock3.then(async(): Promise<void> => {
      results.push(3);
      return mocker.release({ path: 'path3' });
    });
    await lock1.then(async(): Promise<void> => {
      results.push(1);
      return mocker.release({ path: 'path1' });
    });
    expect(results).toEqual([ 2, 3, 1 ]);
  });
});
