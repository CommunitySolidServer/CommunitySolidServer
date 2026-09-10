import { EventEmitter } from 'node:events';
import { Algebra } from 'sparqlalgebrajs';
import type { AuxiliaryIdentifierStrategy } from '../../../src/http/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { N3Patch } from '../../../src/http/representation/N3Patch';
import type { Representation } from '../../../src/http/representation/Representation';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
import type { SparqlUpdatePatch } from '../../../src/http/representation/SparqlUpdatePatch';
import { LockingResourceStore } from '../../../src/storage/LockingResourceStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import type { ExpiringReadWriteLocker } from '../../../src/util/locking/ExpiringReadWriteLocker';
import type { ReadWriteLocker } from '../../../src/util/locking/ReadWriteLocker';
import type { PromiseOrValue } from '../../../src/util/PromiseUtil';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';
import { flushPromises } from '../../util/Util';

function emptyFn(): void {
  // Empty
}

describe('A LockingResourceStore', (): void => {
  const auxiliaryId = { path: 'http://test.com/foo.dummy' };
  const subjectId = { path: 'http://test.com/foo' };
  let data: Representation;
  let store: LockingResourceStore;
  let locker: jest.Mocked<ExpiringReadWriteLocker>;
  let source: ResourceStore;
  let auxiliaryStrategy: AuxiliaryIdentifierStrategy;
  let order: string[];
  let timeoutTrigger: EventEmitter;

  beforeEach(async(): Promise<void> => {
    order = [];
    function addOrder<T>(name: string, input?: T): T | undefined {
      order.push(name);
      return input;
    }

    data = { data: guardedStreamFrom([ 1, 2, 3 ]) } as any;

    const readable = guardedStreamFrom([ 1, 2, 3 ]);
    const destroy = readable.destroy.bind(readable);
    jest.spyOn(readable, 'destroy').mockImplementation((error): any => destroy.call(readable, error));
    source = {
      getRepresentation: jest.fn((): any => addOrder('getRepresentation', { data: readable } as Representation)),
      addResource: jest.fn((): any => addOrder('addResource')),
      setRepresentation: jest.fn((): any => addOrder('setRepresentation')),
      deleteResource: jest.fn((): any => addOrder('deleteResource')),
      modifyResource: jest.fn((): any => addOrder('modifyResource')),
      hasResource: jest.fn((): any => addOrder('hasResource')),
    };

    timeoutTrigger = new EventEmitter();

    locker = {
      withReadLock: jest.fn(async <T>(
        id: ResourceIdentifier,
        whileLocked: (maintainLock: () => void) => PromiseOrValue<T>,
      ): Promise<T> => {
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
      }) satisfies ReadWriteLocker['withReadLock'] as any,
      withWriteLock: jest.fn(async <T>(
        identifier: ResourceIdentifier,
        whileLocked: (maintainLock: () => void) => PromiseOrValue<T>,
      ): Promise<T> => {
        order.push('lock write');
        try {
          // Allows simulating a timeout event
          const timeout = new Promise<never>((resolve, reject): any => timeoutTrigger.on('timeout', (): void => {
            order.push('timeout');
            reject(new Error('timeout'));
          }));
          return await Promise.race([ Promise.resolve(whileLocked(emptyFn)), timeout ]);
        } finally {
          order.push('unlock write');
        }
      }) satisfies ReadWriteLocker['withWriteLock'] as any,
    };

    auxiliaryStrategy = {
      isAuxiliaryIdentifier: jest.fn((id: ResourceIdentifier): any => id.path.endsWith('.dummy')),
      getSubjectIdentifier: jest.fn((id: ResourceIdentifier): any => ({ path: id.path.slice(0, -6) })),
    } as any;

    store = new LockingResourceStore(source, locker, auxiliaryStrategy);
  });

  function registerEventOrder(eventSource: EventEmitter, event: string): void {
    eventSource.on(event, (): void => {
      order.push(event);
    });
  }

  it('acquires a lock on the container when adding a representation.', async(): Promise<void> => {
    await store.addResource(subjectId, data);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(locker.withWriteLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.addResource).toHaveBeenCalledTimes(1);
    expect(source.addResource).toHaveBeenLastCalledWith(subjectId, expect.any(Object), undefined);
    expect(order).toEqual([ 'lock write', 'addResource', 'unlock write' ]);

    order = [];
    await expect(store.addResource(auxiliaryId, data)).resolves.toBeUndefined();
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect(locker.withWriteLock.mock.calls[1][0]).toEqual(subjectId);
    expect(source.addResource).toHaveBeenCalledTimes(2);
    expect(source.addResource).toHaveBeenLastCalledWith(auxiliaryId, expect.any(Object), undefined);
    expect(order).toEqual([ 'lock write', 'addResource', 'unlock write' ]);
  });

  it('acquires a lock on the resource when setting its representation.', async(): Promise<void> => {
    await store.setRepresentation(subjectId, data);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(locker.withWriteLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(subjectId, expect.any(Object), undefined);
    expect(order).toEqual([ 'lock write', 'setRepresentation', 'unlock write' ]);

    order = [];
    await expect(store.setRepresentation(auxiliaryId, data)).resolves.toBeUndefined();
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect(locker.withWriteLock.mock.calls[1][0]).toEqual(subjectId);
    expect(source.setRepresentation).toHaveBeenCalledTimes(2);
    expect(source.setRepresentation).toHaveBeenLastCalledWith(auxiliaryId, expect.any(Object), undefined);
    expect(order).toEqual([ 'lock write', 'setRepresentation', 'unlock write' ]);
  });

  it('acquires a lock on the resource when deleting it.', async(): Promise<void> => {
    await store.deleteResource(subjectId);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(locker.withWriteLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.deleteResource).toHaveBeenCalledTimes(1);
    expect(source.deleteResource).toHaveBeenLastCalledWith(subjectId, undefined);
    expect(order).toEqual([ 'lock write', 'deleteResource', 'unlock write' ]);

    order = [];
    await expect(store.deleteResource(auxiliaryId)).resolves.toBeUndefined();
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect(locker.withWriteLock.mock.calls[1][0]).toEqual(subjectId);
    expect(source.deleteResource).toHaveBeenCalledTimes(2);
    expect(source.deleteResource).toHaveBeenLastCalledWith(auxiliaryId, undefined);
    expect(order).toEqual([ 'lock write', 'deleteResource', 'unlock write' ]);
  });

  it('acquires a lock on the resource when modifying its representation.', async(): Promise<void> => {
    const patch: N3Patch = {
      ...data,
      deletes: [],
      inserts: [],
      conditions: [],
    };

    await store.modifyResource(subjectId, patch);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(locker.withWriteLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.modifyResource).toHaveBeenCalledTimes(1);
    const expiringPatch = jest.mocked(source.modifyResource).mock.calls[0][1] as N3Patch;
    expect(source.modifyResource).toHaveBeenLastCalledWith(subjectId, expiringPatch, undefined);
    expect(expiringPatch).not.toBe(patch);
    expect(expiringPatch.data).not.toBe(patch.data);
    expect(expiringPatch.deletes).toBe(patch.deletes);
    expect(expiringPatch.inserts).toBe(patch.inserts);
    expect(expiringPatch.conditions).toBe(patch.conditions);
    expect(order).toEqual([ 'lock write', 'modifyResource', 'unlock write' ]);

    order = [];
    await expect(store.modifyResource(auxiliaryId, patch)).resolves.toBeUndefined();
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect(locker.withWriteLock.mock.calls[1][0]).toEqual(subjectId);
    expect(source.modifyResource).toHaveBeenCalledTimes(2);
    expect(source.modifyResource).toHaveBeenLastCalledWith(auxiliaryId, expect.any(Object), undefined);
    expect(order).toEqual([ 'lock write', 'modifyResource', 'unlock write' ]);
  });

  it('resets the write lock expiration every time incoming data is read.', async(): Promise<void> => {
    const originalRead = jest.spyOn(data.data, 'read');
    const maintainLock = jest.fn();
    locker.withWriteLock.mockImplementationOnce((async <T>(
      identifier: ResourceIdentifier,
      whileLocked: (maintain: () => void) => PromiseOrValue<T>,
    ): Promise<T> => whileLocked(maintainLock)) satisfies ReadWriteLocker['withWriteLock'] as any);
    jest.spyOn(source, 'setRepresentation').mockImplementation(
      async(identifier: ResourceIdentifier, representation: Representation): Promise<any> => {
        representation.data.read();
        representation.data.read();
        order.push('setRepresentation');
      },
    );

    await store.setRepresentation(subjectId, data);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    const expiringRepresentation = jest.mocked(source.setRepresentation).mock.calls[0][1];
    expect(source.setRepresentation).toHaveBeenLastCalledWith(subjectId, expiringRepresentation, undefined);
    expect(expiringRepresentation).not.toBe(data);
    expect(expiringRepresentation.data).not.toBe(data.data);
    expect(maintainLock).toHaveBeenCalledTimes(2);

    // The original stream is not adapted
    expect(data.data.read).toBe(originalRead);
    data.data.read();
    expect(maintainLock).toHaveBeenCalledTimes(2);
  });

  it.each([ 'addResource', 'setRepresentation', 'modifyResource' ] as const)(
    'preserves the metadata of the representation passed to %s by reference.',
    async(method): Promise<void> => {
      const representation = new BasicRepresentation('data', subjectId, 'text/plain');

      await store[method](subjectId, representation);
      const expiringRepresentation = jest.mocked(source[method]).mock.calls[0][1];
      expect(expiringRepresentation.metadata).toBe(representation.metadata);
      expect(expiringRepresentation.binary).toBe(representation.binary);
      expect(expiringRepresentation.isEmpty).toBe(false);
    },
  );

  it('preserves the metadata of the returned representation by reference.', async(): Promise<void> => {
    const representation = new BasicRepresentation('data', subjectId, 'text/plain');
    jest.spyOn(source, 'getRepresentation').mockResolvedValueOnce(representation);

    const expiringRepresentation = await store.getRepresentation(subjectId, {});
    expect(expiringRepresentation.metadata).toBe(representation.metadata);

    expiringRepresentation.data.destroy();
    await flushPromises();
  });

  it('preserves the empty state of a representation.', async(): Promise<void> => {
    await store.setRepresentation(subjectId, new BasicRepresentation());
    const expiringRepresentation = jest.mocked(source.setRepresentation).mock.calls[0][1];
    expect(expiringRepresentation.isEmpty).toBe(true);
  });

  it('preserves SPARQL update algebra when modifying a resource.', async(): Promise<void> => {
    const patch: SparqlUpdatePatch = {
      ...data,
      algebra: { type: Algebra.types.DELETE_INSERT, delete: [], insert: []},
    };

    await store.modifyResource(subjectId, patch);
    const expiringPatch = jest.mocked(source.modifyResource).mock.calls[0][1] as SparqlUpdatePatch;
    expect(expiringPatch.data).not.toBe(patch.data);
    expect(expiringPatch.algebra).toBe(patch.algebra);
  });

  it('destroys the incoming data stream if the write lock expires.', async(): Promise<void> => {
    const originalRead = jest.spyOn(data.data, 'read');
    const destroy = jest.spyOn(data.data, 'destroy');
    jest.spyOn(source, 'setRepresentation').mockImplementation((): any => {
      order.push('useless set');
      // This will never resolve
      return new Promise(emptyFn);
    });

    const prom = store.setRepresentation(subjectId, data);

    timeoutTrigger.emit('timeout');

    await expect(prom).rejects.toThrow('timeout');
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenLastCalledWith(new Error('timeout'));
    expect(data.data.read).toBe(originalRead);
    expect(order).toEqual([ 'lock write', 'useless set', 'timeout', 'unlock write' ]);
  });

  it('does not destroy the incoming data stream if the write itself errors.', async(): Promise<void> => {
    const destroy = jest.spyOn(data.data, 'destroy');
    jest.spyOn(source, 'setRepresentation').mockImplementation((): any => {
      order.push('bad set');
      throw new Error('dummy');
    });

    await expect(store.setRepresentation(subjectId, data)).rejects.toThrow('dummy');
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(0);
    expect(order).toEqual([ 'lock write', 'bad set', 'unlock write' ]);
  });

  it('does not destroy the incoming data stream if the write lock can not be acquired.', async(): Promise<void> => {
    const destroy = jest.spyOn(data.data, 'destroy');
    locker.withWriteLock.mockImplementationOnce(async(): Promise<never> => {
      order.push('failed lock');
      throw new Error('lock error');
    });

    await expect(store.setRepresentation(subjectId, data)).rejects.toThrow('lock error');
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect(source.setRepresentation).toHaveBeenCalledTimes(0);
    expect(destroy).toHaveBeenCalledTimes(0);
    expect(order).toEqual([ 'failed lock' ]);
  });

  it('releases the lock if an error was thrown.', async(): Promise<void> => {
    source.getRepresentation = async(): Promise<any> => {
      order.push('bad get');
      throw new Error('dummy');
    };
    await expect(store.getRepresentation(subjectId, {})).rejects.toThrow('dummy');
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(order).toEqual([ 'lock read', 'bad get', 'unlock read' ]);
  });

  it('releases the lock on the resource when data has been read.', async(): Promise<void> => {
    // Read all data from the representation
    const representation = await store.getRepresentation(subjectId, {});
    representation.data.on('data', (): any => true);
    registerEventOrder(representation.data, 'end');

    // Provide opportunity for async events
    await flushPromises();

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(subjectId, {}, undefined);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'end', 'unlock read' ]);
  });

  it('acquires the lock on the subject resource when reading an auxiliary resource.', async(): Promise<void> => {
    // Read all data from the representation
    const representation = await store.getRepresentation(auxiliaryId, {});
    representation.data.on('data', (): any => true);
    registerEventOrder(representation.data, 'end');

    // Provide opportunity for async events
    await flushPromises();

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(auxiliaryId, {}, undefined);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'end', 'unlock read' ]);
  });

  it('destroys the resource and releases the lock when the readable errors.', async(): Promise<void> => {
    // Make the representation error
    const representation = await store.getRepresentation(subjectId, {});
    setImmediate((): any => representation.data.emit('error', new Error('Error on the readable')));
    registerEventOrder(representation.data, 'error');
    registerEventOrder(representation.data, 'close');

    // Provide opportunity for async events
    await flushPromises();

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(representation.data.destroy).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'error', 'unlock read', 'close' ]);
  });

  it('releases the lock on the resource when readable is destroyed.', async(): Promise<void> => {
    // Make the representation close
    const representation = await store.getRepresentation(subjectId, {});
    representation.data.destroy();
    registerEventOrder(representation.data, 'close');

    // Provide opportunity for async events
    await flushPromises();

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'close', 'unlock read' ]);
  });

  it('releases the lock only once when multiple events are triggered.', async(): Promise<void> => {
    // Read all data from the representation and trigger an additional close event
    const representation = await store.getRepresentation(subjectId, {});
    representation.data.on('data', (): any => true);
    representation.data.prependListener('end', (): any => {
      order.push('end');
      representation.data.destroy();
    });

    // Provide opportunity for async events
    await flushPromises();

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'end', 'unlock read' ]);
  });

  it('releases the lock on the resource when readable times out.', async(): Promise<void> => {
    const representation = await store.getRepresentation(subjectId, {});
    registerEventOrder(representation.data, 'close');
    registerEventOrder(representation.data, 'error');

    timeoutTrigger.emit('timeout');

    // Provide opportunity for async events
    await flushPromises();

    // Verify the lock was acquired and released at the right time
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(representation.data.destroy).toHaveBeenCalledTimes(1);
    expect(representation.data.destroy).toHaveBeenLastCalledWith(new Error('timeout'));
    expect(order).toEqual([ 'lock read', 'getRepresentation', 'timeout', 'unlock read', 'error', 'close' ]);
  });

  it('throws an error if a timeout happens before getting a resource.', async(): Promise<void> => {
    jest.spyOn(source, 'getRepresentation').mockImplementation(async(): Promise<any> => {
      order.push('useless get');
      // This will never resolve
      return new Promise(emptyFn);
    });

    const prom = store.getRepresentation(subjectId, {});

    timeoutTrigger.emit('timeout');

    await expect(prom).rejects.toThrow('timeout');
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withReadLock.mock.calls[0][0]).toEqual(subjectId);
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(order).toEqual([ 'lock read', 'useless get', 'timeout', 'unlock read' ]);
  });

  it('hasResource should only acquire and release the read lock.', async(): Promise<void> => {
    await store.hasResource(subjectId);
    expect(locker.withReadLock).toHaveBeenCalledTimes(1);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(0);
    expect(source.hasResource).toHaveBeenCalledTimes(1);
    expect(source.hasResource).toHaveBeenLastCalledWith(subjectId);
    expect(order).toEqual([ 'lock read', 'hasResource', 'unlock read' ]);
  });
});
