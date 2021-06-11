import { RootContainerInitializer } from '../../src/init/RootContainerInitializer';
import { RoutingAuxiliaryStrategy } from '../../src/ldp/auxiliary/RoutingAuxiliaryStrategy';
import { BasicRepresentation } from '../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../src/ldp/representation/Representation';
import { InMemoryDataAccessor } from '../../src/storage/accessors/InMemoryDataAccessor';
import { DataAccessorBasedStore } from '../../src/storage/DataAccessorBasedStore';
import { LockingResourceStore } from '../../src/storage/LockingResourceStore';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { APPLICATION_OCTET_STREAM } from '../../src/util/ContentTypes';
import { InternalServerError } from '../../src/util/errors/InternalServerError';
import { SingleRootIdentifierStrategy } from '../../src/util/identifiers/SingleRootIdentifierStrategy';
import { EqualReadWriteLocker } from '../../src/util/locking/EqualReadWriteLocker';
import type { ExpiringReadWriteLocker } from '../../src/util/locking/ExpiringReadWriteLocker';
import type { ReadWriteLocker } from '../../src/util/locking/ReadWriteLocker';
import { SingleThreadedResourceLocker } from '../../src/util/locking/SingleThreadedResourceLocker';
import { WrappedExpiringReadWriteLocker } from '../../src/util/locking/WrappedExpiringReadWriteLocker';
import { guardedStreamFrom } from '../../src/util/StreamUtil';
jest.useFakeTimers('legacy');

describe('A LockingResourceStore', (): void => {
  let path: string;
  let store: LockingResourceStore;
  let locker: ReadWriteLocker;
  let expiringLocker: ExpiringReadWriteLocker;
  let source: ResourceStore;
  let getRepresentationSpy: jest.SpyInstance;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    // Not relevant for these tests
    const strategy = new RoutingAuxiliaryStrategy([]);

    const base = 'http://test.com/';
    path = `${base}path`;
    const idStrategy = new SingleRootIdentifierStrategy(base);
    source = new DataAccessorBasedStore(
      new InMemoryDataAccessor(idStrategy),
      idStrategy,
      strategy,
    );

    // Initialize store
    const initializer = new RootContainerInitializer({ store: source, baseUrl: base });
    await initializer.handleSafe();

    locker = new EqualReadWriteLocker(new SingleThreadedResourceLocker());
    expiringLocker = new WrappedExpiringReadWriteLocker(locker, 1000);

    store = new LockingResourceStore(source, expiringLocker, strategy);

    // Spy on a real ResourceLocker and ResourceStore instance
    getRepresentationSpy = jest.spyOn(source, 'getRepresentation');
    getRepresentationSpy.mockReturnValue(new Promise((resolve): any => resolve({ data:
        guardedStreamFrom([ 1, 2, 3 ]) } as Representation)));

    // Make sure something is in the store before we read from it in our tests.
    await source.setRepresentation({ path }, new BasicRepresentation([ 1, 2, 3 ], APPLICATION_OCTET_STREAM));
  });

  it('destroys the stream when nothing is read after 1000ms.', async(): Promise<void> => {
    const representation = await store.getRepresentation({ path }, {});
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Wait 1000ms and read
    jest.advanceTimersByTime(1000);
    await new Promise(setImmediate);
    expect(representation.data.destroyed).toBe(true);

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new InternalServerError(`Lock expired after 1000ms on ${path}`));

    // Verify the lock was acquired and released at the right time
    expect(getRepresentationSpy).toHaveBeenCalledTimes(1);
  });

  it('destroys the stream when pauses between reads exceed 1000ms.', async(): Promise<void> => {
    const representation = await store.getRepresentation({ path }, {});
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Wait 750ms and read
    jest.advanceTimersByTime(750);
    expect(representation.data.destroyed).toBe(false);
    representation.data.read();

    // Wait 750ms and read
    jest.advanceTimersByTime(750);
    expect(representation.data.destroyed).toBe(false);
    representation.data.read();

    // Wait 1000ms and watch the stream be destroyed
    jest.advanceTimersByTime(1000);
    await new Promise(setImmediate);
    expect(representation.data.destroyed).toBe(true);

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new InternalServerError(`Lock expired after 1000ms on ${path}`));

    // Verify the lock was acquired and released at the right time
    expect(getRepresentationSpy).toHaveBeenCalledTimes(1);
  });
});
