import type { HttpRequest } from '../../../server/HttpRequest';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Parser for the `content-type` header.
 */
export class ContentTypeParser extends MetadataParser {
  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const contentType = input.request.headers['content-type'];
    if (contentType) {
      input.metadata.contentType = contentType;
    }
  }
}
