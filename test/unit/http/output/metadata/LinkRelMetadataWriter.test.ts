import { createResponse } from 'node-mocks-http';
import { LinkRelMetadataWriter } from '../../../../../src/http/output/metadata/LinkRelMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { LDP, RDF } from '../../../../../src/util/Vocabularies';

describe('A LinkRelMetadataWriter', (): void => {
  const writer = new LinkRelMetadataWriter({ [RDF.type]: 'type', dummy: 'dummy' });

  it('adds the correct link headers.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata({ [RDF.type]: LDP.terms.Resource, unused: 'text' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ link: `<${LDP.Resource}>; rel="type"` });
  });
});
