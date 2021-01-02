import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { parseParameters, splitAndClean, transformQuotedStrings } from '../../../util/HeaderUtil';
import { RDF } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import type { MetadataParser } from './MetadataParser';

/**
 * Parses Link headers with "rel=type" parameters and adds them as RDF.type metadata.
 */
export class LinkTypeParser implements MetadataParser {
  protected readonly logger = getLoggerFor(this);

  public async parse(request: HttpRequest, metadata: RepresentationMetadata): Promise<void> {
    const link = request.headers.link ?? [];
    const entries: string[] = Array.isArray(link) ? link : [ link ];
    for (const entry of entries) {
      this.parseLink(entry, metadata);
    }
  }

  protected parseLink(linkEntry: string, metadata: RepresentationMetadata): void {
    const { result, replacements } = transformQuotedStrings(linkEntry);
    for (const part of splitAndClean(result)) {
      const [ link, ...parameters ] = part.split(/\s*;\s*/u);
      if (/^[^<]|[^>]$/u.test(link)) {
        this.logger.warn(`Invalid link header ${part}.`);
        continue;
      }
      for (const { name, value } of parseParameters(parameters, replacements)) {
        if (name === 'rel' && value === 'type') {
          metadata.add(RDF.type, DataFactory.namedNode(link.slice(1, -1)));
        }
      }
    }
  }
}
