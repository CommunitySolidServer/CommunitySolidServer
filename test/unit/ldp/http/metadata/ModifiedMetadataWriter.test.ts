import { createResponse } from 'node-mocks-http';
import { ModifiedMetadataWriter } from '../../../../../src/ldp/http/metadata/ModifiedMetadataWriter';
import { RepresentationMetadata } from '../../../../../src/ldp/representation/RepresentationMetadata';
import type { HttpResponse } from '../../../../../src/server/HttpResponse';
import { updateModifiedDate } from '../../../../../src/util/ResourceUtil';
import { DC } from '../../../../../src/util/Vocabularies';

describe('A ModifiedMetadataWriter', (): void => {
  const writer = new ModifiedMetadataWriter();

  it('adds the Last-Modified and ETag header if there is dc:modified metadata.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata();
    updateModifiedDate(metadata);
    const dateTime = metadata.get(DC.terms.modified)!.value;
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({
      'last-modified': new Date(dateTime).toUTCString(),
      etag: `"${new Date(dateTime).getTime()}"`,
    });
  });

  it('does nothing if there is no matching metadata.', async(): Promise<void> => {
    const response = createResponse() as HttpResponse;
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ response, metadata })).resolves.toBeUndefined();
    expect(response.getHeaders()).toEqual({});
  });
});
