import { BasicRepresentation } from '../../../src/http/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../src/http/representation/ResourceIdentifier';
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
          return new BasicRepresentation('index data', identifier, 'text/html');
        }
        if (identifier.path.endsWith('/')) {
          return new BasicRepresentation('container data', identifier, 'text/turtle');
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

  it('retrieves the index resource if it is explicitly preferred.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0.5, 'text/html': 0.8 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('index data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    expect(source.getRepresentation).toHaveBeenCalledWith({ path: `${baseUrl}index.html` }, preferences, undefined);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, {}, undefined);

    // Use correct metadata
    expect(result.metadata.identifier.value).toBe(baseUrl);
    expect(result.metadata.contentType).toBe('text/html');
  });

  it('retrieves the index resource if there is a range preference.', async(): Promise<void> => {
    const preferences = { type: { 'text/*': 0.8, 'other/other': 0.7 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('index data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    expect(source.getRepresentation).toHaveBeenCalledWith({ path: `${baseUrl}index.html` }, preferences, undefined);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, {}, undefined);

    // Use correct metadata
    expect(result.metadata.identifier.value).toBe(baseUrl);
    expect(result.metadata.contentType).toBe('text/html');
  });

  it('does not retrieve the index resource if there are no type preferences.', async(): Promise<void> => {
    const preferences = {};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('container data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, preferences, undefined);

    // Use correct metadata
    expect(result.metadata.identifier.value).toBe(baseUrl);
    expect(result.metadata.contentType).toBe('text/turtle');
  });

  it('does not retrieve the index resource on */*.', async(): Promise<void> => {
    const preferences = { type: { '*/*': 1 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('container data');
  });

  it('errors if a non-404 error was thrown when accessing the index resource.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0.5, 'text/html': 0.8 }};
    source.getRepresentation.mockRejectedValueOnce(new ConflictHttpError('conflict!'));
    await expect(store.getRepresentation({ path: baseUrl }, preferences)).rejects.toThrow('conflict!');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
  });

  it('requests the usual data if there is no index resource.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0.5, 'text/html': 0.8 }};
    source.getRepresentation.mockRejectedValueOnce(new NotFoundHttpError());
    const result = await store.getRepresentation(emptyContainer, preferences);
    await expect(readableToString(result.data)).resolves.toBe('container data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    expect(source.getRepresentation).toHaveBeenCalledWith(
      { path: `${emptyContainer.path}index.html` },
      preferences,
      undefined,
    );
    expect(source.getRepresentation).toHaveBeenLastCalledWith(emptyContainer, preferences, undefined);
  });

  it('requests the usual data if the index media range is not the most preferred.', async(): Promise<void> => {
    const preferences = { type: { 'text/turtle': 0.8, 'text/html': 0.5 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('container data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(1);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, preferences, undefined);
  });

  it('returns the index resource if the media range is set to */*.', async(): Promise<void> => {
    store = new IndexRepresentationStore(source, 'base.html', '*/*');
    // Mocking because we also change the index name
    source.getRepresentation.mockResolvedValueOnce(new BasicRepresentation('index data', 'text/html'));

    const preferences = { type: { 'text/turtle': 0.8, 'text/html': 0.5 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('index data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    expect(source.getRepresentation).toHaveBeenCalledWith({ path: `${baseUrl}base.html` }, preferences, undefined);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, {}, undefined);

    // Use correct metadata
    expect(result.metadata.identifier.value).toBe(baseUrl);
    expect(result.metadata.contentType).toBe('text/html');
  });

  it('returns the index resource if media range and Accept header are */*.', async(): Promise<void> => {
    store = new IndexRepresentationStore(source, 'base.html', '*/*');
    // Mocking because we also change the index name
    source.getRepresentation.mockResolvedValueOnce(new BasicRepresentation('index data', 'text/html'));

    const preferences = { type: { '*/*': 1 }};
    const result = await store.getRepresentation({ path: baseUrl }, preferences);
    await expect(readableToString(result.data)).resolves.toBe('index data');
    expect(source.getRepresentation).toHaveBeenCalledTimes(2);
    expect(source.getRepresentation).toHaveBeenCalledWith({ path: `${baseUrl}base.html` }, preferences, undefined);
    expect(source.getRepresentation).toHaveBeenLastCalledWith({ path: baseUrl }, {}, undefined);
  });
});
