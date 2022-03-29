import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { parseLinkHeader } from '../../../util/HeaderUtil';
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

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const contentType = input.request.headers['content-type'];
    const link = input.request.headers.link ?? [];
    const entries: string[] = Array.isArray(link) ? link : [ link ];
    // Throw error on content-type application/json AND a link header that refers to a JSON-LD context.
    if (contentType === 'application/json' && this.linkHasContextRelation(entries)) {
      throw new NotImplementedError('JSON-LD is only supported with the application/ld+json content type.');
    }
  }

  private linkHasContextRelation(linkHeaders: string[]): boolean {
    for (const { params } of parseLinkHeader(linkHeaders)) {
      if (params.rel && params.rel === JSON_LD.context) {
        return true;
      }
    }
    return false;
  }
}
