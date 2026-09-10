import { RoutingAuxiliaryStrategy } from '../../src/http/auxiliary/RoutingAuxiliaryStrategy';
import { BasicRepresentation } from '../../src/http/representation/BasicRepresentation';
import type { Representation } from '../../src/http/representation/Representation';
import { RepresentationMetadata } from '../../src/http/representation/RepresentationMetadata';
import { InMemoryDataAccessor } from '../../src/storage/accessors/InMemoryDataAccessor';
import { DataAccessorBasedStore } from '../../src/storage/DataAccessorBasedStore';
import { LockingResourceStore } from '../../src/storage/LockingResourceStore';
import type { ResourceStore } from '../../src/storage/ResourceStore';
import { APPLICATION_OCTET_STREAM, TEXT_TURTLE } from '../../src/util/ContentTypes';
import { InternalServerError } from '../../src/util/errors/InternalServerError';
import { SingleRootIdentifierStrategy } from '../../src/util/identifiers/SingleRootIdentifierStrategy';
import { EqualReadWriteLocker } from '../../src/util/locking/EqualReadWriteLocker';
import type { ExpiringReadWriteLocker } from '../../src/util/locking/ExpiringReadWriteLocker';
import { MemoryResourceLocker } from '../../src/util/locking/MemoryResourceLocker';
import type { ReadWriteLocker } from '../../src/util/locking/ReadWriteLocker';
import { WrappedExpiringReadWriteLocker } from '../../src/util/locking/WrappedExpiringReadWriteLocker';
import { endOfStream, guardedStreamFrom } from '../../src/util/StreamUtil';
import { PIM, RDF } from '../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../util/SimpleSuffixStrategy';
import { flushPromises } from '../util/Util';

jest.useFakeTimers();

describe('A LockingResourceStore', (): void => {
  let path: string;
  let store: LockingResourceStore;
  let locker: ReadWriteLocker;
  let expiringLocker: ExpiringReadWriteLocker;
  let source: ResourceStore;
  let getRepresentationSpy: jest.SpyInstance;
  let setRepresentationSpy: jest.SpyInstance;
  let expiringRepresentation: Representation | undefined;

  beforeEach(async(): Promise<void> => {
    jest.clearAllMocks();

    // Not relevant for these tests
    const strategy = new RoutingAuxiliaryStrategy([]);
    const metadataStrategy = new SimpleSuffixStrategy('.meta');

    const base = 'http://test.com/';
    path = `${base}path`;
    const idStrategy = new SingleRootIdentifierStrategy(base);
    source = new DataAccessorBasedStore(
      new InMemoryDataAccessor(idStrategy),
      idStrategy,
      strategy,
      metadataStrategy,
    );

    // Initialize store
    const metadata = new RepresentationMetadata({ path: base }, TEXT_TURTLE);
    metadata.add(RDF.terms.type, PIM.terms.Storage);
    await source.setRepresentation({ path: base }, new BasicRepresentation([], metadata));

    locker = new EqualReadWriteLocker(new MemoryResourceLocker());
    expiringLocker = new WrappedExpiringReadWriteLocker(locker, 1000);

    store = new LockingResourceStore(source, expiringLocker, strategy);

    // Spy on a real ResourceLocker and ResourceStore instance
    getRepresentationSpy = jest.spyOn(source, 'getRepresentation');
    getRepresentationSpy.mockReturnValue(new Promise((resolve): any => resolve({ data:
        guardedStreamFrom([ 1, 2, 3 ]) } as Representation)));

    // Make sure something is in the store before we read from it in our tests.
    await source.setRepresentation({ path }, new BasicRepresentation([ 1, 2, 3 ], APPLICATION_OCTET_STREAM));

    // Simulates a source store that waits for the incoming data to end before resolving
    setRepresentationSpy = jest.spyOn(source, 'setRepresentation');
    setRepresentationSpy.mockImplementation(
      async(identifier, representation: Representation): Promise<any> => {
        expiringRepresentation = representation;
        return endOfStream(representation.data);
      },
    );
  });

  it('destroys the stream when nothing is read after 1000ms.', async(): Promise<void> => {
    const representation = await store.getRepresentation({ path }, {});
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Wait 1000ms and read
    jest.advanceTimersByTime(1000);
    await flushPromises();
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
    await flushPromises();
    expect(representation.data.destroyed).toBe(true);

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new InternalServerError(`Lock expired after 1000ms on ${path}`));

    // Verify the lock was acquired and released at the right time
    expect(getRepresentationSpy).toHaveBeenCalledTimes(1);
  });

  it('destroys the incoming stream when nothing is written after 1000ms.', async(): Promise<void> => {
    const representation = new BasicRepresentation([ 1, 2, 3 ], APPLICATION_OCTET_STREAM);
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Catch the expected error so its rejection is handled before the timer fires
    let error: unknown;
    const promise = store.setRepresentation({ path }, representation).catch((err: unknown): void => {
      error = err;
    });
    // Allow the lock to be acquired
    await flushPromises();
    expect(setRepresentationSpy).toHaveBeenCalledTimes(1);
    expect(expiringRepresentation).toBeDefined();

    // Wait 1000ms without writing
    jest.advanceTimersByTime(1000);
    await flushPromises();
    expect(representation.data.destroyed).toBe(true);
    await promise;
    expect(error).toEqual(new InternalServerError(`Lock expired after 1000ms on ${path}`));

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new InternalServerError(`Lock expired after 1000ms on ${path}`));
  });

  it('destroys the incoming stream when pauses between writes exceed 1000ms.', async(): Promise<void> => {
    const representation = new BasicRepresentation([ 1, 2, 3 ], APPLICATION_OCTET_STREAM);
    const errorCallback = jest.fn();
    representation.data.on('error', errorCallback);

    // Catch the expected error so its rejection is handled before the timer fires
    let error: unknown;
    const promise = store.setRepresentation({ path }, representation).catch((err: unknown): void => {
      error = err;
    });
    // Allow the lock to be acquired
    await flushPromises();
    expect(setRepresentationSpy).toHaveBeenCalledTimes(1);
    expect(expiringRepresentation).toBeDefined();

    // Wait 750ms and read
    jest.advanceTimersByTime(750);
    expect(representation.data.destroyed).toBe(false);
    if (!expiringRepresentation) {
      throw new Error('The source store did not receive an expiring representation.');
    }
    expiringRepresentation.data.read();

    // Wait 750ms and read
    jest.advanceTimersByTime(750);
    expect(representation.data.destroyed).toBe(false);
    expiringRepresentation.data.read();

    // Wait 1000ms and watch the stream be destroyed
    jest.advanceTimersByTime(1000);
    await flushPromises();
    expect(representation.data.destroyed).toBe(true);
    await promise;
    expect(error).toEqual(new InternalServerError(`Lock expired after 1000ms on ${path}`));

    // Verify a timeout error was thrown
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenLastCalledWith(new InternalServerError(`Lock expired after 1000ms on ${path}`));
  });
});
