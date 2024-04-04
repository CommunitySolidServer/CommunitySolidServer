import { createResponse } from 'node-mocks-http';
import { AuxiliaryLinkMetadataWriter } from '../../../../../src/http/output/metadata/AuxiliaryLinkMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { LDP, RDF, SOLID_ERROR } from '../../../../../src/util/Vocabularies';
import { SimpleSuffixStrategy } from '../../../../util/SimpleSuffixStrategy';

describe('A LinkRelMetadataWriter', (): void => {
  const auxiliaryStrategy = new SimpleSuffixStrategy('.dummy');
  const metadataStrategy = new SimpleSuffixStrategy('.meta');
  const writer = new AuxiliaryLinkMetadataWriter(auxiliaryStrategy, metadataStrategy, 'test');
  let identifier: ResourceIdentifier;

  beforeEach((): void => {
    identifier = { path: 'http://example.org/' };
  });

  it('adds the correct link headers.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata(identifier);
    metadata.add(RDF.terms.type, LDP.terms.Resource);

    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link:
      `<${identifier.path}.meta>; rel="test"` });
  });

  it('does not add link headers for auxiliary resources.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    identifier.path += '.dummy';
    const metadata = new RepresentationMetadata(identifier);
    metadata.add(RDF.terms.type, LDP.terms.Resource);

    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });

  it('adds link headers for errors.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata();
    metadata.add(SOLID_ERROR.terms.target, identifier.path);
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link:
        `<${identifier.path}.meta>; rel="test"` });
  });

  it('does not add link headers for errors without a target.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });
});
