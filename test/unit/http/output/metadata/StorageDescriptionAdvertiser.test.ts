import type { TargetExtractor } from '../../../../../src/http/input/identifier/TargetExtractor';
import type { MetadataWriterInput } from '../../../../../src/http/output/metadata/MetadataWriter';
import { StorageDescriptionAdvertiser } from '../../../../../src/http/output/metadata/StorageDescriptionAdvertiser';
import { BasicRepresentation } from '../../../../../src/http/representation/BasicRepresentation';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import type { ResourceStore } from '../../../../../src/storage/ResourceStore';
import { SingleRootIdentifierStrategy } from '../../../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { joinUrl } from '../../../../../src/util/PathUtil';
import { LDP, PIM, RDF } from '../../../../../src/util/Vocabularies';

describe('A StorageDescriptionAdvertiser', (): void => {
  let metadata: RepresentationMetadata;
  let response: jest.Mocked<HttpResponse>;
  let input: MetadataWriterInput;
  const baseUrl = 'http://example.com/';
  const suffix = '.well-known/solid';
  let targetExtractor: jest.Mocked<TargetExtractor>;
  const identifierStrategy = new SingleRootIdentifierStrategy(baseUrl);
  let store: jest.Mocked<ResourceStore>;
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

    targetExtractor = {
      handleSafe: jest.fn(({ request: req }): ResourceIdentifier => ({ path: joinUrl(baseUrl, req.url!) })),
    } as any;

    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation('', { [RDF.type]: PIM.terms.Storage })),
    } as any;

    advertiser = new StorageDescriptionAdvertiser(targetExtractor, identifierStrategy, store, suffix);
  });

  it('adds a storage description link header.', async(): Promise<void> => {
    await expect(advertiser.handle(input)).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(1);
    expect(response.setHeader).toHaveBeenLastCalledWith('Link',
      '<http://example.com/foo/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"');
  });

  it('only handles results with resource metadata.', async(): Promise<void> => {
    metadata.removeAll(RDF.terms.type);
    await expect(advertiser.handle(input)).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(0);
  });

  it('does nothing if it cannot find a storage root.', async(): Promise<void> => {
    // No storage container will be found
    store.getRepresentation.mockResolvedValue(new BasicRepresentation());
    await expect(advertiser.handle(input)).resolves.toBeUndefined();
    expect(response.setHeader).toHaveBeenCalledTimes(0);
  });
});
