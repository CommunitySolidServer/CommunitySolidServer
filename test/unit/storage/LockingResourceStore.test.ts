import { EventEmitter } from 'events';
import type { Patch } from '../../../src/ldp/http/Patch';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { LockingResourceStore } from '../../../src/storage/LockingResourceStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import type { ExpiringReadWriteLocker } from '../../../src/util/locking/ExpiringReadWriteLocker';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

function emptyFn(): void {
  // Empty
}

describe('A LockingResourceStore', (): void => {
  let store: LockingResourceStore;
  let locker: ExpiringReadWriteLocker;
  let source: ResourceStore;
  let order: string[];
  let timeoutTrigger: EventEmitter;

  beforeEach(async(): Promise<void> => {
    order = [];
    function addOrder<T>(name: string, input?: T): T | undefined {
      order.push(name);
      return input;
    }

    const readable = guardedStreamFrom([ 1, 2, 3 ]);
    const { destroy } = readable;
    readable.destroy = jest.fn((error): void => destroy.call(readable, error));
    source = {
      getRepresentation: jest.fn((): any => addOrder('getRepresentation', { data: readable } as Representation)),
      addResource: jest.fn((): any => addOrder('addResource')),
      setRepresentation: jest.fn((): any => addOrder('setRepresentation')),
      deleteResource: jest.fn((): any => addOrder('deleteResource')),
      modifyResource: jest.fn((): any => addOrder('modifyResource')),
    };

    timeoutTrigger = new EventEmitter();

    locker = {
      withReadLock: jest.fn(async <T>(id: ResourceIdentifier,
        whileLocked: (maintainLock: () => void) => T | Promise<T>): Promise<T> => {
        order.push('lock read');
        try {
          // Allows simulating a timeout event
          const timeout = new Promise<never>((resolve, reject): any => timeoutTrigger.on('timeout', (): void => {
            order.push('timeout');
            reject(new Error('timeout'));
          }));
          return await Promise.race([ Promise.resolve(whileLocked(emptyFn)), timeout ]);
        } finally {
          order.push('unlock read');
        }
      }),
      withWriteLock: jest.fn(async <T>(identifier: ResourceIdentifier,
        whileLocked: (maintainLock: () => void) => T | Promise<T>): Promise<T> => {
        order.push('lock write');
        try {
          return await whileLocked(emptyFn);
        } finally {
          order.push('unlock write');
        }
      }),
    };

    store = new LockingResourceStore(source, locker);
  });

  function registerEventOrder(eventSource: EventEmitter, event: string): void {
    eventSource.on(event, (): void => {
      order.push(event);
    });
  }

  it('acquires a lock on the container when adding a representation.', async(): Promise<void> => {
    await store.addResource({ path: 'path' }, {} as Representation);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock write', 'addResource', 'unlock write' ]);
  });

  it('acquires a lock on the resource when setting its representation.', async(): Promise<void> => {
    await store.setRepresentation({ path: 'path' }, {} as Representation);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock write', 'setRepresentation', 'unlock write' ]);
  });

  it('acquires a lock on the resource when deleting it.', async(): Promise<void> => {
    await store.deleteResource({ path: 'path' });
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock write', 'deleteResource', 'unlock write' ]);
  });

  it('acquires a lock on the resource when modifying its representation.', async(): Promise<void> => {
    await store.modifyResource({ path: 'path' }, {} as Patch);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock write', 'modifyResource', 'unlock write' ]);
  });

  it('releases the lock if an error was thrown.', async(): Promise<void> => {
    source.getRepresentation = async(): Promise<any> => {
      order.push('bad get');
      throw new Error('dummy');
    };
    await expect(store.getRepresentation({ path: 'path' }, {})).rejects.toThrow('dummy');
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(order).toEqual([ 'lock read', 'bad get', 'unlock read' ]);
  });

  it('releases the lock on the resource when data has been read.', async(): Promise<void> => {
    // Read all data from the representation
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.on('data', (): any => true);
    registerEventOrder(representation.data, 'end');

    // Provide opportunity for async events
    await new Promise(setImmediate);

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'end', 'unlock read' ]);
  });

  it('destroys the resource and releases the lock when the readable errors.', async(): Promise<void> => {
    // Make the representation error
    const representation = await store.getRepresentation({ path: 'path' }, {});
    setImmediate((): any => representation.data.emit('error', new Error('Error on the readable')));
    registerEventOrder(representation.data, 'error');
    registerEventOrder(representation.data, 'close');

    // Provide opportunity for async events
    await new Promise(setImmediate);

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(representation.data.destroy).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'error', 'unlock read', 'close' ]);
  });

  it('releases the lock on the resource when readable is destroyed.', async(): Promise<void> => {
    // Make the representation close
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.destroy();
    registerEventOrder(representation.data, 'close');

    // Provide opportunity for async events
    await new Promise(setImmediate);

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'close', 'unlock read' ]);
  });

  it('releases the lock only once when multiple events are triggered.', async(): Promise<void> => {
    // Read all data from the representation and trigger an additional close event
    const representation = await store.getRepresentation({ path: 'path' }, {});
    representation.data.on('data', (): any => true);
    representation.data.prependListener('end', (): any => {
      order.push('end');
      representation.data.destroy();
    });
    registerEventOrder(representation.data, 'close');

    // Provide opportunity for async events
    await new Promise(setImmediate);

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'end', 'close', 'unlock read' ]);
  });

  it('releases the lock on the resource when readable times out.', async(): Promise<void> => {
    const representation = await store.getRepresentation({ path: 'path' }, {});
    registerEventOrder(representation.data, 'close');
    registerEventOrder(representation.data, 'error');

    timeoutTrigger.emit('timeout');

    // Provide opportunity for async events
    await new Promise(setImmediate);

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(representation.data.destroy).toHaveBeenCalledTimes(1);
    expect(representation.data.destroy).toHaveBeenLastCalledWith(new Error('timeout'));
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'timeout', 'unlock read', 'error', 'close' ]);
  });

  it('throws an error if a timeout happens before getting a resource.', async(): Promise<void> => {
    source.getRepresentation = jest.fn(async(): Promise<any> => {
      order.push('useless get');
      // This will never resolve
      return new Promise(emptyFn);
    });

    const prom = store.getRepresentation({ path: 'path' }, {});

    timeoutTrigger.emit('timeout');

    await expect(prom).rejects.toThrow('timeout');
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect((locker.withReadLock as jest.Mock).mock.calls[0][0]).toEqual({ path: 'path' });
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'useless get', 'timeout', 'unlock read' ]);
  });
});
