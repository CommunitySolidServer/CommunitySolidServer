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
        this.logger.warn('At most 1 slug header is allowed.');
        throw new UnsupportedHttpError('At most 1 slug header is allowed.');
      }
      metadata.set(HTTP.slug, slug);
      this.logger.info(`Slug header set to '${slug}'.`);
    }
  }
}
