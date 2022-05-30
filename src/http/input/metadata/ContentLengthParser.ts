import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Parser for the `content-length` header.
 */
export class ContentLengthParser extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const contentLength = input.request.headers['content-length'];
    if (contentLength) {
      const length = /^\s*(\d+)\s*(?:;.*)?$/u.exec(contentLength)?.[1];
      if (length) {
        input.metadata.contentLength = Number(length);
      } else {
        this.logger.warn(`Invalid content-length header found: ${contentLength}.`);
      }
    }
  }
}
