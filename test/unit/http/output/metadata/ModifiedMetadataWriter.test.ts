import { createResponse } from 'node-mocks-http';
import { ModifiedMetadataWriter } from '../../../../../src/http/output/metadata/ModifiedMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/http/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { getETag } from '../../../../../src/storage/Conditions';
import { updateModifiedDate } from '../../../../../src/util/ResourceUtil';
import { CONTENT_TYPE, DC } from '../../../../../src/util/Vocabularies';

describe('A ModifiedMetadataWriter', (): void => {
  const writer = new ModifiedMetadataWriter();

  it('adds the Last-Modified and ETag header if there is dc:modified metadata.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata({ [CONTENT_TYPE]: 'text/turtle' });
    updateModifiedDate(metadata);
    const dateTime = metadata.get(DC.terms.modified)!.value;
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'last-modified': new Date(dateTime).toUTCString(),
      etag: getETag(metadata),
    });
  });

  it('does nothing if there is no matching metadata.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });
});
