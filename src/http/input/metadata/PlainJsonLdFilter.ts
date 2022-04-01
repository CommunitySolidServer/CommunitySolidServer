import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { NotImplementedHttpError } from '../../../util/errors/NotImplementedHttpError';
import { parseContentType, parseLinkHeader } from '../../../util/HeaderUtil';
import { JSON_LD } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Filter that errors on JSON-LD with a plain application/json content-type.
 * This will not store metadata, only throw errors if necessary.
 */
export class PlainJsonLdFilter extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  public constructor() {
    super();
  }

  public async handle(input: {
    request: HttpRequest;
    metadata: RepresentationMetadata;
  }): Promise<void> {
    const contentTypeHeader = input.request.headers['content-type'];
    if (!contentTypeHeader) {
      return;
    }
    const { value: contentType } = parseContentType(contentTypeHeader);
    // Throw error on content-type application/json AND a link header that refers to a JSON-LD context.
    if (
      contentType === 'application/json' &&
      this.linkHasContextRelation(input.request.headers.link)
    ) {
      throw new NotImplementedHttpError(
        'JSON-LD is only supported with the application/ld+json content type.',
      );
    }
  }

  private linkHasContextRelation(link: string | string[] = []): boolean {
    return parseLinkHeader(link).some(
      ({ parameters }): boolean => parameters.rel === JSON_LD.context,
    );
  }
}
