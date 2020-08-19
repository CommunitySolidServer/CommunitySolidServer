import { EventEmitter } from 'events';
import { Lock } from '../../../src/storage/Lock';
import { LockingResourceStore } from '../../../src/storage/LockingResourceStore';
import { Patch } from '../../../src/ldp/http/Patch';
import { Representation } from '../../../src/ldp/representation/Representation';
import { ResourceLocker } from '../../../src/storage/ResourceLocker';
import { ResourceStore } from '../../../src/storage/ResourceStore';
import streamifyArray from 'streamify-array';

describe('A LockingResourceStore', (): void => {
  let store: LockingResourceStore;
  let locker: ResourceLocker;
  let lock: Lock;
  let release: () => Promise<void>;
  let source: ResourceStore;
  let order: string[];

  beforeEach(async(): Promise<void> => {
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
    locker = {
      acquire: jest.fn(async(): Promise<any> => {
        order.push('acquire');
        lock = { release };
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

  it('releases the lock on the resource when readable errors.', async(): Promise<void> => {
    // Make the representation error
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.destroy(new Error('Error on the Readable :('));
    await registerEventOrder(representation.data, 'error');

    // Verify the lock was acquired and released at the right time
    expect(locker.acquire).toHaveBeenCalledTimes(1);
    expect(locker.acquire).toHaveBeenLastCalledWith({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(lock.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'acquire', 'getRepresentation', 'error', 'release' ]);
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
});
