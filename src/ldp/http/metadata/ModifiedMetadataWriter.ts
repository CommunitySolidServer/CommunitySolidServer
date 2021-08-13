import type { HttpResponse } from '../../../server/HttpResponse';
import { getETag } from '../../../storage/Conditions';
import { addHeader } from '../../../util/HeaderUtil';
import { DC } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that generates all the necessary headers related to the modification date of a resource.
 */
export class ModifiedMetadataWriter extends MetadataWriter {
  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const modified = input.metadata.get(DC.terms.modified);
    if (modified) {
      const date = new Date(modified.value);
      addHeader(input.response, 'Last-Modified', date.toUTCString());
    }
    const etag = getETag(input.metadata);
    if (etag) {
      addHeader(input.response, 'ETag', etag);
    }
  }
}
