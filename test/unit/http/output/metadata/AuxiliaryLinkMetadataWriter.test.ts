import { createResponse } from 'node-mocks-http';
import { AuxiliaryLinkMetadataWriter } from '../../../../../src/http/output/metadata/AuxiliaryLinkMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../../src/http/representation/ResourceIdentifier';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { SimpleSuffixStrategy } from '../../../../util/SimpleSuffixStrategy';

describe('A LinkRelMetadataWriter', (): void => {
  const auxiliaryStrategy = new SimpleSuffixStrategy('.dummy');
  const metadataStrategy = new SimpleSuffixStrategy('.meta');
  const writer = new AuxiliaryLinkMetadataWriter(auxiliaryStrategy, metadataStrategy);
  let identifier: ResourceIdentifier;

  beforeEach((): void => {
    identifier = { path: 'http://example.org/' };
  });

  it('adds the correct link headers.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata(identifier);

    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<${identifier.path}.meta>; rel="describedBy"` });
  });

  it('does not add link headers for auxiliary resources.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    identifier.path += '.dummy';
    const metadata = new RepresentationMetadata(identifier);

    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ });
  });
});
