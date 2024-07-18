import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import type { ReadWriteLocker } from '../../../../src/util/locking/ReadWriteLocker';
import { WrappedExpiringReadWriteLocker } from '../../../../src/util/locking/WrappedExpiringReadWriteLocker';
import type { PromiseOrValue } from '../../../../src/util/PromiseUtil';

jest.useFakeTimers();

describe('A WrappedExpiringReadWriteLocker', (): void => {
  const identifier = { path: 'path' };
  let syncCb: () => string;
  let asyncCb: () => Promise<string>;
  let wrappedLocker: jest.Mocked<ReadWriteLocker>;
  let locker: WrappedExpiringReadWriteLocker;
  const expiration = 1000;

  beforeEach(async(): Promise<void> => {
    wrappedLocker = {
      withReadLock: jest.fn(async<T>(id: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>):
      Promise<T> => whileLocked()) satisfies ReadWriteLocker['withReadLock'] as any,
      withWriteLock: jest.fn(async<T>(id: ResourceIdentifier, whileLocked: () => PromiseOrValue<T>):
      Promise<T> => whileLocked()) satisfies ReadWriteLocker['withWriteLock'] as any,
    };

    syncCb = jest.fn((): string => 'sync');
    asyncCb = jest.fn(async(): Promise<string> => new Promise((resolve): void => {
      setImmediate((): void => resolve('async'));
    }));

    locker = new WrappedExpiringReadWriteLocker(wrappedLocker, expiration);
  });

  it('calls the wrapped locker for locking.', async(): Promise<void> => {
    let prom = locker.withReadLock(identifier, syncCb);
    await expect(prom).resolves.toBe('sync');
    expect(wrappedLocker.withReadLock).toHaveBeenCalledTimes(1);
    expect(wrappedLocker.withReadLock.mock.calls[0][0]).toBe(identifier);

    prom = locker.withWriteLock(identifier, syncCb);
    await expect(prom).resolves.toBe('sync');
    expect(wrappedLocker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(wrappedLocker.withWriteLock.mock.calls[0][0]).toBe(identifier);
  });

  it('calls the functions that need to be locked through the wrapped locker.', async(): Promise<void> => {
    let prom = locker.withReadLock(identifier, syncCb);
    await expect(prom).resolves.toBe('sync');
    expect(syncCb).toHaveBeenCalledTimes(1);

    prom = locker.withReadLock(identifier, asyncCb);

    // Execute promise (without triggering timeout)
    jest.advanceTimersByTime(100);

    await expect(prom).resolves.toBe('async');
    expect(asyncCb).toHaveBeenCalledTimes(1);
  });

  it('throws an error if the locked function resolves too slow.', async(): Promise<void> => {
    async function slowCb(): Promise<void> {
      return new Promise((resolve): any => setTimeout(resolve, 5000));
    }
    const prom = locker.withReadLock(identifier, slowCb);
    jest.advanceTimersByTime(1000);
    await expect(prom).rejects.toThrow(`Lock expired after ${expiration}ms on ${identifier.path}`);
  });

  it('can reset the timer within the locked function.', async(): Promise<void> => {
    async function refreshCb(maintainLock: () => void): Promise<string> {
      return new Promise((resolve): any => {
        setTimeout(maintainLock, 750);
        setTimeout((): void => resolve('refresh'), 1500);
      });
    }
    const prom = locker.withReadLock(identifier, refreshCb);
    jest.advanceTimersByTime(1500);
    await expect(prom).resolves.toBe('refresh');
  });

  it('can still error after resetting the timer.', async(): Promise<void> => {
    async function refreshCb(maintainLock: () => void): Promise<void> {
      return new Promise((resolve): any => {
        setTimeout(maintainLock, 750);
        setTimeout(maintainLock, 1500);
        setTimeout(resolve, 5000);
      });
    }
    const prom = locker.withReadLock(identifier, refreshCb);
    jest.advanceTimersByTime(5000);
    await expect(prom).rejects.toThrow(`Lock expired after ${expiration}ms on ${identifier.path}`);
  });
});
