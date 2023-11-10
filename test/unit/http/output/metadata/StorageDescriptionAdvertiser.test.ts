import type { MetadataWriterInput } from '../../../../../src/http/output/metadata/MetadataWriter';
import { StorageDescriptionAdvertiser } from '../../../../../src/http/output/metadata/StorageDescriptionAdvertiser';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { StorageLocationStrategy } from '../../../../../src/server/description/StorageLocationStrategy';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { BadRequestHttpError } from '../../../../../src/util/errors/BadRequestHttpError';
import { LDP, RDF } from '../../../../../src/util/Vocabularies';

describe('A StorageDescriptionAdvertiser', (): void => {
  let metadata: RepresentationMetadata;
  let response: jest.Mocked<HttpResponse>;
  let input: MetadataWriterInput;
  const storageIdentifier = { path: 'http://example.com/foo/' };
  let strategy: jest.Mocked<StorageLocationStrategy>;
  const relativePath = '.well-known/solid';
  let advertiser: StorageDescriptionAdvertiser;

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata({ path: 'http://example.com/foo/' }, { [RDF.type]: LDP.terms.Resource });

    const headerMap = new Map<string, string[]>();
    response = {
      hasHeader: jest.fn((header): boolean => headerMap.has(header)),
      getHeader: jest.fn((header): string[] | undefined => headerMap.get(header)),
      setHeader: jest.fn((header, values: string[]): any => headerMap.set(header, values)),
    } as any;

    input = { metadata, response };

    strategy = {
      getStorageIdentifier: jest.fn().mockResolvedValue(storageIdentifier),
    };

    advertiser = new StorageDescriptionAdvertiser(strategy, relativePath);
  });

  it('adds a storage description link header.', async(): Promise<void> => {
    await expect(advertiser.handle(input)).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenLastCalledWith(
      'Link',
      '<http://example.com/foo/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"',
    );
  });

  it('only handles results with resource metadata.', async(): Promise<void> => {
    metadata.removeAll(RDF.terms.type);
    await expect(advertiser.handle(input)).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(0);
  });

  it('does nothing if it cannot find a storage root.', async(): Promise<void> => {
    // No storage container will be found
    strategy.getStorageIdentifier.mockRejectedValue(new BadRequestHttpError('bad identifier'));
    await expect(advertiser.handle(input)).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(0);
  });
});
