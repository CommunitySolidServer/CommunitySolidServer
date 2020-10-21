import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { UnsupportedHttpError } from '../../../util/errors/UnsupportedHttpError';
import { HTTP } from '../../../util/UriConstants';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { MetadataParser } from './MetadataParser';

/**
 * Converts the contents of the slug header to metadata.
 */
export class SlugParser implements MetadataParser {
  protected readonly logger = getLoggerFor(this);

  public async parse(request: HttpRequest, metadata: RepresentationMetadata): Promise<void> {
    const { slug } = request.headers;
    if (slug) {
      if (Array.isArray(slug)) {
        this.logger.warn(`Expected 0 or 1 Slug headers but received ${slug.length}`);
        throw new UnsupportedHttpError('Request has multiple Slug headers');
      }
      this.logger.debug(`Request Slug is '${slug}'.`);
      metadata.set(HTTP.slug, slug);
    }
  }
}
