import type { HttpRequest } from '../../../server/HttpRequest';
import { UnsupportedHttpError } from '../../../util/errors/UnsupportedHttpError';
import { HTTP } from '../../../util/UriConstants';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { MetadataParser } from './MetadataParser';

/**
 * Converts the contents of the slug header to metadata.
 */
export class SlugParser implements MetadataParser {
  public async parse(request: HttpRequest, metadata: RepresentationMetadata): Promise<void> {
    const { slug } = request.headers;
    if (slug) {
      if (Array.isArray(slug)) {
        throw new UnsupportedHttpError('At most 1 slug header is allowed.');
      }
      metadata.set(HTTP.slug, slug);
    }
  }
}
