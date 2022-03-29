import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { BadRequestHttpError } from '../../../util/errors/BadRequestHttpError';
import { parseParameters, splitAndClean, transformQuotedStrings } from '../../../util/HeaderUtil';
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
    if (contentType === 'application/json' && entries.some((entry): boolean => this.linkHasContextRelation(entry))) {
      throw new BadRequestHttpError(`Conflict detected: 
      The Link header indicates a JSON-LD context, while the content-type is set to application/json.`);
    }
  }

  private linkHasContextRelation(linkEntry: string): boolean {
    const { result, replacements } = transformQuotedStrings(linkEntry);
    for (const part of splitAndClean(result)) {
      const [ link, ...parameters ] = part.split(/\s*;\s*/u);
      if (/^[^<]|[^>]$/u.test(link)) {
        this.logger.warn(`Invalid link header ${part}.`);
        continue;
      }
      for (const { name, value } of parseParameters(parameters, replacements)) {
        if (name === 'rel' && value === JSON_LD.context) {
          return true;
        }
      }
    }
    return false;
  }
}
