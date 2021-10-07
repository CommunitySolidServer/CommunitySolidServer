import type { HttpRequest } from '../../../server/HttpRequest';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Parser for the `content-length` header.
 */
export class ContentLengthParser extends MetadataParser {
  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const contentLength = input.request.headers['content-length'];
    if (contentLength) {
      input.metadata.contentLength = /^\s*(\d+)\s*(?:;.*)?$/u.exec(contentLength)![0].trim();
    }
  }
}
