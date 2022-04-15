import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Converts the contents of the slug header to metadata.
 */
export class SlugParser extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const { slug } = input.request.headers;
    if (slug) {
      if (Array.isArray(slug)) {
        this.logger.warn(`Expected 0 or 1 Slug headers but received ${slug.length}`);
        throw new BadRequestHttpError('Request has multiple Slug headers');
      }
      this.logger.debug(`Request Slug is '${slug}'.`);
      input.metadata.set(SOLID_HTTP.terms.slug, slug);
    }
  }
}
