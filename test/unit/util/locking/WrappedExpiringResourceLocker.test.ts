import type { EventEmitter } from 'events';
import streamifyArray from 'streamify-array';
import { WrappedExpiringResourceLocker } from '../../../../src/util/locking/WrappedExpiringResourceLocker';

describe('A WrappedExpiringResourceLocker', (): void => {
  let order: string[];

  beforeEach(async(): Promise<void> => {
    order = [];
  });

  async function registerEventOrder(eventSource: EventEmitter, event: string): Promise<void> {
    await new Promise((resolve): any => {
      eventSource.prependListener(event, (): any => {
        order.push(event);
        resolve();
      });
    });
  }

  it('emits an error event when releasing the lock errors.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Create a locker that fails upon release
    const faultyLocker = {
      acquire(): any {
        return {
          async release(): Promise<never> {
            throw new Error('Release error');
          },
        };
      },
    };
    const expiringLocker = new WrappedExpiringResourceLocker(faultyLocker, 1000);
    const expiringLock = await expiringLocker.acquire({} as any);
    const errorCallback = jest.fn();
    expiringLock.on('error', errorCallback);

    // Let the lock expire
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Verify the error has been emitted
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new Error('Release error'));
  });

  it('releases the lock on the resource when data has been read.', async(): Promise<void> => {
    // Mock the inner ResourceLocker.
    const release = jest.fn(async(): Promise<any> => order.push('release'));
    const lock = { release };
    const locker = {
      acquire: jest.fn(async(): Promise<any> => {
        order.push('acquire');
        return lock;
      }),
    };

    const expiringLocker = new WrappedExpiringResourceLocker(locker, 1000);
    const expiringLock = await expiringLocker.acquire({} as any);

    // Mimic the behavior of a LockingResourceStore to test the expiringLock methods called.
    const source = streamifyArray([ 1, 2, 3 ]);
    // eslint-disable-next-line jest/valid-expect-in-promise
    new Promise((resolve): void => {
      source.on('end', resolve);
      source.on('close', resolve);
    }).then((): any => expiringLock.release(), null);
    const readable = Object.create(source, {
      read: {
        value(size: number): any {
          expiringLock.renew();
          return source.read(size);
        },
      },
    });

    // Read all data from the "representation"
    readable.on('data', (): any => true);
    await registerEventOrder(readable, 'end');

    // Verify the lock was acquired and released at the right time
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'end', 'release' ]);
  });
});
