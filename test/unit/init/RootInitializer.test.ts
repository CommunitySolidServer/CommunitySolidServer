import { RootInitializer } from '../../../src/init/RootInitializer';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../src/ldp/representation/RepresentationMetadata';
import type { Logger } from '../../../src/logging/Logger';
import { getLoggerFor } from '../../../src/logging/LogUtil';
import type { Resource, ResourcesGenerator } from '../../../src/pods/generate/ResourcesGenerator';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { PIM, RDF } from '../../../src/util/Vocabularies';

jest.mock('../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});

describe('A RootInitializer', (): void => {
  const baseUrl = 'http://test.com/foo/';
  let store: jest.Mocked<ResourceStore>;
  let generatorData: Resource[];
  let generator: jest.Mocked<ResourcesGenerator>;
  let initializer: RootInitializer;
  let logger: jest.Mocked<Logger>;

  beforeEach(async(): Promise<void> => {
    store = {
      getRepresentation: jest.fn().mockRejectedValue(new NotFoundHttpError()),
      setRepresentation: jest.fn(),
    } as any;

    generatorData = [
      { identifier: { path: '/.acl' }, representation: '/.acl' as any },
      { identifier: { path: '/container/' }, representation: '/container/' as any },
    ];
    generator = {
      generate: jest.fn(async function* (): any {
        yield* generatorData;
      }),
    } as any;

    initializer = new RootInitializer(baseUrl, store, generator);
    logger = getLoggerFor(initializer) as any;
    jest.clearAllMocks();
  });

  it('does nothing is the root container already has pim:Storage metadata.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata({ path: baseUrl }, { [RDF.type]: PIM.terms.Storage });
    store.getRepresentation.mockResolvedValueOnce(new BasicRepresentation('data', metadata));

    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(generator.generate).toHaveBeenCalledTimes(0);
    expect(store.setRepresentation).toHaveBeenCalledTimes(0);
  });

  it('writes new resources if the container does not exist yet.', async(): Promise<void> => {
    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledTimes(2);
  });

  it('writes new resources if the container is not a pim:Storage.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValueOnce(new BasicRepresentation('data', 'text/string'));

    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledTimes(2);
  });

  it('throws an error if there is a problem accessing the root container.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValueOnce(new Error('bad data'));
    await expect(initializer.handle()).rejects.toThrow('bad data');
  });

  it('logs warnings if there was a problem creating a resource.', async(): Promise<void> => {
    store.setRepresentation.mockRejectedValueOnce(new Error('bad input'));

    await expect(initializer.handle()).resolves.toBeUndefined();
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith('Failed to create resource /.acl: bad input');
  });
});
