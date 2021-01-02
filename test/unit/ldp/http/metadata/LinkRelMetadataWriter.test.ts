import { createResponse } from 'node-mocks-http';
import { LinkRelMetadataWriter } from '../../../../../src/ldp/http/metadata/LinkRelMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import { LDP, RDF } from '../../../../../src/util/UriConstants';
import { toCachedNamedNode } from '../../../../../src/util/UriUtil';

describe('A LinkRelMetadataWriter', (): void => {
  const writer = new LinkRelMetadataWriter({ [RDF.type]: 'type', dummy: 'dummy' });

  it('adds the correct link headers.', async(): Promise<void> => {
    const response = createResponse();
    const metadata = new RepresentationMetadata({ [RDF.type]: toCachedNamedNode(LDP.Resource), unused: 'text' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<${LDP.Resource}>; rel="type"` });
  });
});
