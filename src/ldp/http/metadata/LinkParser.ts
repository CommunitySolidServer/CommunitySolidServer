import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { parseParameters, splitAndClean, transformQuotedStrings } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';

/**
 * Parses Link headers and adds them as metadata with the given predicate.
 */
export class LinkParser extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  private readonly value: string;
  private readonly predicateNode: NamedNode;

  public constructor(value: string, predicate: string) {
    super();
    this.predicateNode = DataFactory.namedNode(predicate);
    this.value = value;
  }

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    const link = input.request.headers.link ?? [];
    const entries: string[] = Array.isArray(link) ? link : [ link ];
    for (const entry of entries) {
      this.parseLink(entry, input.metadata);
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
        if (name === 'rel' && value === this.value) {
          metadata.add(this.predicateNode, DataFactory.namedNode(link.slice(1, -1)));
        }
      }
    }
  }
}
