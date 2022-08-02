import type { HttpResponse } from '../../../server/HttpResponse';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * Adds the `Content-Type` header containing value and parameters (if available).
 */
export class ContentTypeMetadataWriter extends MetadataWriter {
  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const { contentTypeObject } = input.metadata;
    if (contentTypeObject) {
      input.response.setHeader('Content-Type', contentTypeObject.toHeaderValueString());
    }
  }
}
