import type { HttpRequest } from '../../../server/HttpRequest';
import { parseContentType } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Parser for the `content-type` header.
 * Currently only stores the media type and ignores other parameters such as charset.
 */
export class ContentTypeParser extends MetadataParser {
  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const contentType = input.request.headers['content-type'];
    if (contentType) {
      input.metadata.contentType = parseContentType(contentType).value;
    }
  }
}
