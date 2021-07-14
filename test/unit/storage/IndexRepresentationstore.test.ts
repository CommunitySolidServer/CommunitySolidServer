import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { IndexRepresentationStore } from '../../../src/storage/IndexRepresentationStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { ConflictHttpError } from '../../../src/util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { readableToString } from '../../../src/util/StreamUtil';

describe('An IndexRepresentationStore', (): void => {
  const baseUrl = 'http://test.com/';
  const emptyContainer = { path: `${baseUrl}/container/` };
  let source: jest.Mocked<ResourceStore>;
  let store: IndexRepresentationStore;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn((identifier: ResourceIdentifier): any => {
        if (identifier.path === `${baseUrl}index.html`) {
          return new BasicRepresentation('index data', 'text/html');
        }
        if (identifier.path.endsWith('/')) {
          return new BasicRepresentation('container data', 'text/turtle');
        }
        throw new NotFoundHttpError();
      }),
    } as any;

    store = new IndexRepresentationStore(source);
  });

  it('errors on invalid index names.', async(): Promise<void> => {
    expect((): any => new IndexRepresentationStore(source, '../secretContainer/secret.key'))
      .toThrow('Invalid index name');
  });

  it('retrieves the index resource if it exists.', async(): Promise<void> => {
    const result = await store.getRepresentation({ path: baseUrl }, {});
    await expect(readableToString(result.data)).resolves.toBe('index data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });

  it('errors if a non-404 error was thrown when accessing the index resource.', async(): Promise<void> => {
    source.getRepresentation.mockRejectedValueOnce(new ConflictHttpError('conflict!'));
    await expect(store.getRepresentation({ path: baseUrl }, {})).rejects.toThrow('conflict!');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });

  it('requests the usual data if there is no index resource.', async(): Promise<void> => {
    const result = await store.getRepresentation(emptyContainer, {});
    await expect(readableToString(result.data)).resolves.toBe('container data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    expect(source.getRepresentation).toHaveBeenCalledWith({ path: `${emptyContainer.path}index.html` }, {}, undefined);
    expect(source.getRepresentation).toHaveBeenLastCalledWith(emptyContainer, {}, undefined);
  });

  it('requests the usual data if the index media range is not the most preferred.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0.8, 'text/html': 0.5 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('container data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, preferences, undefined);
  });

  it('always returns the index resource if the media range is set to */*.', async(): Promise<void> => {
    store = new IndexRepresentationStore(source, 'base.html', '*/*');
    // Mocking because we also change the index name
    source.getRepresentation.mockResolvedValueOnce(new BasicRepresentation('index data', 'text/html'));

    const preferences = { type: { 'text/turtle': 0.8, 'text/html': 0.5 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('index data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: `${baseUrl}base.html` }, preferences, undefined);
  });
});
