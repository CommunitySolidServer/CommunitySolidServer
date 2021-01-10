import streamifyArray from 'streamify-array';
import { RootContainerInitializer } from '../../src/init/RootContainerInitializer';
import { BasicRepresentation } from '../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../src/ldp/representation/Representation';
import { InMemoryDataAccessor } from '../../src/storage/accessors/InMemoryDataAccessor';
import { DataAccessorBasedStore } from '../../src/storage/DataAccessorBasedStore';
import { LockingResourceStore } from '../../src/storage/LockingResourceStore';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { APPLICATION_OCTET_STREAM } from '../../src/util/ContentTypes';
import { SingleRootIdentifierStrategy } from '../../src/util/identifiers/SingleRootIdentifierStrategy';
import type { ExpiringResourceLocker } from '../../src/util/locking/ExpiringResourceLocker';
import type { ResourceLocker } from '../../src/util/locking/ResourceLocker';
import { SingleThreadedResourceLocker } from '../../src/util/locking/SingleThreadedResourceLocker';
import { WrappedExpiringResourceLocker } from '../../src/util/locking/WrappedExpiringResourceLocker';
import { BASE } from './Config';

describe('A LockingResourceStore', (): void => {
  let path: string;
  let store: LockingResourceStore;
  let locker: ResourceLocker;
  let expiringLocker: ExpiringResourceLocker;
  let source: ResourceStore;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    const base = 'http://test.com/';
    path = `${base}path`;
    source = new DataAccessorBasedStore(new InMemoryDataAccessor(base), new SingleRootIdentifierStrategy(base));

    // Initialize store
    const initializer = new RootContainerInitializer(BASE, source);
    await initializer.handleSafe();

    locker = new SingleThreadedResourceLocker();
    expiringLocker = new WrappedExpiringResourceLocker(locker, 1000);

    store = new LockingResourceStore(source, expiringLocker);

    // Make sure something is in the store before we read from it in our tests.
    await store.setRepresentation({ path }, new BasicRepresentation([ 1, 2, 3 ], APPLICATION_OCTET_STREAM));
  });

  it('destroys the stream when nothing is read after 1000ms.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Spy on a real ResourceLocker and ResourceStore instance
    const acquireSpy = jest.spyOn(expiringLocker, 'acquire');
    const getRepresentationSpy = jest.spyOn(source, 'getRepresentation');
    getRepresentationSpy.mockReturnValue(new Promise((resolve): any => resolve({ data:
        streamifyArray([ 1, 2, 3 ]) } as Representation)));

    const representation = await store.getRepresentation({ path }, {});
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Wait 1000ms and read
    jest.advanceTimersByTime(1000);
    expect(representation.data.read()).toBeNull();

    // Verify a timeout error was thrown
    await new Promise((resolve): any => setImmediate(resolve));
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new Error('Stream reading timout exceeded'));

    // Verify the lock was acquired and released at the right time
    expect(acquireSpy).toHaveBeenCalledTimes(1);
    expect(acquireSpy).toHaveBeenLastCalledWith({ path });
    expect(getRepresentationSpy).toHaveBeenCalledTimes(1);
  });

  it('destroys the stream when pauses between reads exceed 1000ms.', async(): Promise<void> => {
    jest.useFakeTimers();

    // Spy on a real ResourceLocker and ResourceStore instance
    const acquireSpy = jest.spyOn(expiringLocker, 'acquire');
    const getRepresentationSpy = jest.spyOn(source, 'getRepresentation');
    getRepresentationSpy.mockReturnValue(new Promise((resolve): any => resolve({ data:
        streamifyArray([ 1, 2, 3 ]) } as Representation)));

    const representation = await store.getRepresentation({ path }, {});
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

    // Verify a timeout error was thrown
    await new Promise((resolve): any => setImmediate(resolve));
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new Error('Stream reading timout exceeded'));

    // Verify the lock was acquired and released at the right time
    expect(acquireSpy).toHaveBeenCalledTimes(1);
    expect(acquireSpy).toHaveBeenLastCalledWith({ path });
    expect(getRepresentationSpy).toHaveBeenCalledTimes(1);
  });
});
