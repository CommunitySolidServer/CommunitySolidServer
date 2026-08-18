import type { ResourceIdentifier } from '../../../../src/http/representation/ResourceIdentifier';
import { ContainerContentTypeMapper } from '../../../../src/storage/mapping/ContainerContentTypeMapper';
import { ExtensionBasedMapper } from '../../../../src/storage/mapping/ExtensionBasedMapper';
import type { FileIdentifierMapper, ResourceLink } from '../../../../src/storage/mapping/FileIdentifierMapper';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('A ContainerContentTypeMapper', (): void => {
  const baseUrl = 'http://example.com/';
  let source: jest.Mocked<FileIdentifierMapper>;
  let mapper: ContainerContentTypeMapper;

  beforeEach((): void => {
    source = {
      mapUrlToFilePath: jest.fn<
        Promise<ResourceLink>,
        Parameters<FileIdentifierMapper['mapUrlToFilePath']>
      >(async(identifier: ResourceIdentifier): Promise<ResourceLink> => ({
        identifier,
        filePath: 'source',
        isMetadata: false,
      })),
      mapFilePathToUrl: jest.fn<
        Promise<ResourceLink>,
        Parameters<FileIdentifierMapper['mapFilePathToUrl']>
      >(async(): Promise<ResourceLink> => ({
        identifier: { path: 'source' },
        filePath: 'source',
        isMetadata: false,
      })),
    };
    mapper = new ContainerContentTypeMapper(
      source,
      baseUrl,
      '/.internal/',
      'application/json',
      'text/turtle',
    );
  });

  it('provides the document content type in the configured container.', async(): Promise<void> => {
    const identifier = { path: `${baseUrl}.internal/accounts/id` };
    await mapper.mapUrlToFilePath(identifier, false);
    expect(source.mapUrlToFilePath).toHaveBeenCalledWith(identifier, false, 'application/json');
  });

  it('provides the metadata content type in the configured container.', async(): Promise<void> => {
    const identifier = { path: `${baseUrl}.internal/accounts/id` };
    await mapper.mapUrlToFilePath(identifier, true);
    expect(source.mapUrlToFilePath).toHaveBeenCalledWith(identifier, true, 'text/turtle');
  });

  it('maps internal resources without changing existing file names.', async(): Promise<void> => {
    mapper = new ContainerContentTypeMapper(
      new ExtensionBasedMapper(baseUrl, '/data/'),
      baseUrl,
      '/.internal/',
      'application/json',
      'text/turtle',
    );
    await expect(mapper.mapUrlToFilePath({ path: `${baseUrl}.internal/id` }, false)).resolves.toMatchObject({
      filePath: '/data/.internal/id$.json',
      contentType: 'application/json',
    });
    await expect(mapper.mapUrlToFilePath({ path: `${baseUrl}.internal/id.json` }, false)).resolves.toMatchObject({
      filePath: '/data/.internal/id.json',
      contentType: 'application/json',
    });
    await expect(mapper.mapUrlToFilePath({ path: `${baseUrl}.internal/id` }, true)).resolves.toMatchObject({
      filePath: '/data/.internal/id.meta',
      contentType: 'text/turtle',
    });
  });

  it('rejects another content type in the configured container.', async(): Promise<void> => {
    const identifier = { path: `${baseUrl}.internal/accounts/id` };
    await expect(mapper.mapUrlToFilePath(identifier, false, 'text/plain')).rejects
      .toThrow(NotImplementedHttpError);
    expect(source.mapUrlToFilePath).not.toHaveBeenCalled();
  });

  it('preserves content types outside the configured container.', async(): Promise<void> => {
    const identifier = { path: `${baseUrl}pod/resource` };
    await mapper.mapUrlToFilePath(identifier, false, 'text/plain');
    expect(source.mapUrlToFilePath).toHaveBeenCalledWith(identifier, false, 'text/plain');
  });

  it('does not match containers with the same prefix.', async(): Promise<void> => {
    const identifier = { path: `${baseUrl}.internal-other/resource` };
    await mapper.mapUrlToFilePath(identifier, false);
    expect(source.mapUrlToFilePath).toHaveBeenCalledWith(identifier, false, undefined);
  });

  it('maps file paths through the source mapper.', async(): Promise<void> => {
    const filePath = '/data/.internal/accounts/id$.json';
    await mapper.mapFilePathToUrl(filePath, false);
    expect(source.mapFilePathToUrl).toHaveBeenCalledWith(filePath, false);
  });
});
