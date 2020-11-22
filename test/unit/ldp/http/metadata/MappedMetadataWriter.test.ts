import { createResponse } from 'node-mocks-http';
import { MappedMetadataWriter } from '../../../../../src/ldp/http/metadata/MappedMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import { CONTENT_TYPE } from '../../../../../src/util/UriConstants';

describe('A MappedMetadataWriter', (): void => {
  const writer = new MappedMetadataWriter({ [CONTENT_TYPE]: 'content-type', dummy: 'dummy' });

  it('adds metadata to the corresponding header.', async(): Promise<void> => {
    const response = createResponse();
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle', unused: 'text' });
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({ 'content-type': 'text/turtle' });
  });
});
