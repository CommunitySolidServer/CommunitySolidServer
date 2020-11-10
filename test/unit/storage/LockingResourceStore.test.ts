import type { EventEmitter } from 'events';
import streamifyArray from 'streamify-array';
import type { Patch } from '../../../src/ldp/http/Patch';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ExpiringLock } from '../../../src/storage/ExpiringLock';
import type { ExpiringResourceLocker } from '../../../src/storage/ExpiringResourceLocker';
import { LockingResourceStore } from '../../../src/storage/LockingResourceStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { WrappedExpiringResourceLocker } from '../../../src/storage/WrappedExpiringResourceLocker';

describe('A LockingResourceStore', (): void => {
  let store: LockingResourceStore;
  let locker: ExpiringResourceLocker;
  let lock: ExpiringLock;
  let release: () => Promise<void>;
  let renew: () => void;
  let source: ResourceStore;
  let order: string[];
  let funcOnEmit: () => any;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    order = [];
    const delayedResolve = (resolve: (resolveParams: any) => void, name: string, resolveParams?: any): void => {
      // `setImmediate` is introduced to make sure the promise doesn't execute immediately
      setImmediate((): void => {
        order.push(name);
        resolve(resolveParams);
      });
    };

    const readable = streamifyArray([ 1, 2, 3 ]);
    source = {
      getRepresentation: jest.fn(async(): Promise<any> =>
        new Promise((resolve): any => delayedResolve(resolve, 'getRepresentation', { data: readable } as
          Representation))),
      addResource: jest.fn(async(): Promise<any> =>
        new Promise((resolve): any => delayedResolve(resolve, 'addResource'))),
      setRepresentation: jest.fn(async(): Promise<any> =>
        new Promise((resolve): any => delayedResolve(resolve, 'setRepresentation'))),
      deleteResource: jest.fn(async(): Promise<any> =>
        new Promise((resolve): any => delayedResolve(resolve, 'deleteResource'))),
      modifyResource: jest.fn(async(): Promise<any> =>
        new Promise((resolve): any => delayedResolve(resolve, 'modifyResource'))),
    };
    release = jest.fn(async(): Promise<any> => order.push('release'));
    renew = jest.fn();
    funcOnEmit = (): any => true;

    locker = {
      acquire: jest.fn(async(): Promise<any> => {
        order.push('acquire');
        lock = {
          release,
          renew,
          on(event: string, func: () => void): void {
            if (event === 'expired') {
              funcOnEmit = func;
            }
          },
          emit(event: string): void {
            if (event === 'expired') {
              funcOnEmit();
            }
          },
        } as unknown as ExpiringLock;
        return lock;
      }),
    };
    store = new LockingResourceStore(source, locker);
  });

  const registerEventOrder = async(eventSource: EventEmitter, event: string): Promise<void> => {
    await new Promise((resolve): any => {
      eventSource.prependListener(event, (): any => {
        order.push(event);
        resolve();
      });
    });
  };

  it('acquires a lock on the container when adding a representation.', async(): Promise<void> => {
    await store.addResource({ path: 'path' }, {} as Representation);
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'addResource', 'release' ]);
  });

  it('acquires a lock on the resource when setting its representation.', async(): Promise<void> => {
    await store.setRepresentation({ path: 'path' }, {} as Representation);
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'setRepresentation', 'release' ]);
  });

  it('acquires a lock on the resource when deleting it.', async(): Promise<void> => {
    await store.deleteResource({ path: 'path' });
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'deleteResource', 'release' ]);
  });

  it('acquires a lock on the resource when modifying its representation.', async(): Promise<void> => {
    await store.modifyResource({ path: 'path' }, {} as Patch);
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'modifyResource', 'release' ]);
  });

  it('releases the lock if an error was thrown.', async(): Promise<void> => {
    source.getRepresentation = async(): Promise<any> => {
      throw new Error('dummy');
    };
    await expect(store.getRepresentation({ path: 'path' }, {})).rejects.toThrow('dummy');
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'release' ]);
  });

  it('releases the lock on the resource when data has been read.', async(): Promise<void> => {
    // Read all data from the representation
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.on('data', (): any => true);
    await registerEventOrder(representation.data, 'end');

    // Verify the lock was acquired and released at the right time
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'getRepresentation', 'end', 'release' ]);
  });

  it('destroys the resource and releases the lock when the readable errors.', async(): Promise<void> => {
    // Make the representation error
    const representation = await store.getRepresentation({ path: 'path' }, {});
    // eslint-disable-next-line jest/valid-expect-in-promise
    Promise.resolve().then((): any =>
      representation.data.emit('error', new Error('Error on the readable')), null);
    await registerEventOrder(representation.data, 'error');
    await registerEventOrder(representation.data, 'close');

    // Verify the lock was acquired and released at the right time
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'getRepresentation', 'error', 'close', 'release' ]);
  });

  it('releases the lock on the resource when readable is destroyed.', async(): Promise<void> => {
    // Make the representation close
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.destroy();
    await registerEventOrder(representation.data, 'close');

    // Verify the lock was acquired and released at the right time
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'getRepresentation', 'close', 'release' ]);
  });

  it('releases the lock only once when multiple events are triggered.', async(): Promise<void> => {
    // Read all data from the representation and trigger an additional close event
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.on('data', (): any => true);
    representation.data.prependListener('end', (): any => {
      order.push('end');
      representation.data.destroy();
    });
    await registerEventOrder(representation.data, 'close');

    // Verify the lock was acquired and released at the right time
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'getRepresentation', 'end', 'close', 'release' ]);
  });

  it('destroys the stream when nothing is read after 1000ms.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Spy on a real ResourceLocker instance
    const strLocker = new WrappedExpiringResourceLocker(locker, 1000);
    store = new LockingResourceStore(source, strLocker);
    const acquireSpy = jest.spyOn(strLocker, 'acquire');

    const representation = await store.getRepresentation({ path: 'path' }, {});
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Wait 1000ms and read
    jest.advanceTimersByTime(1000);
    expect(representation.data.read()).toBeNull();
    await registerEventOrder(representation.data, 'close');

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new Error('Stream reading timout exceeded'));

    // Verify the lock was acquired and released at the right time
    expect(acquireSpy).toHaveBeenCalledTimes(1);
    expect(acquireSpy).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });

  it('destroys the stream when pauses between reads exceed 1000ms.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Spy on a real ResourceLocker instance
    const strLocker = new WrappedExpiringResourceLocker(locker, 1000);
    store = new LockingResourceStore(source, strLocker);
    const acquireSpy = jest.spyOn(strLocker, 'acquire');

    const representation = await store.getRepresentation({ path: 'path' }, {});
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Wait 750ms and read
    jest.advanceTimersByTime(750);
    expect(representation.data.read()).toBe(1);

    // Wait 750ms and read
    jest.advanceTimersByTime(750);
    expect(representation.data.read()).toBe(2);

    // Wait 1000ms and watch the stream be destroyed
    jest.advanceTimersByTime(1000);
    expect(representation.data.read()).toBeNull();
    await registerEventOrder(representation.data, 'close');

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new Error('Stream reading timout exceeded'));

    // Verify the lock was acquired and released at the right time
    expect(acquireSpy).toHaveBeenCalledTimes(1);
    expect(acquireSpy).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });
});
