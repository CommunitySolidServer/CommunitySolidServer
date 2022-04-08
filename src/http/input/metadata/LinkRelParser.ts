import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { parseLinkHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';
import namedNode = DataFactory.namedNode;

/**
 * Parses Link headers with a specific `rel` value and adds them as metadata with the given predicate.
 */
export class LinkRelParser extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  private readonly linkRelMap: Record<string, NamedNode>;

  public constructor(linkRelMap: Record<string, string>) {
    super();
    this.linkRelMap = Object.fromEntries(
      Object.entries(linkRelMap).map(([ header, uri ]): [string, NamedNode] => [ header, namedNode(uri) ]),
    );
  }

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    for (const { target, parameters } of parseLinkHeader(input.request.headers.link)) {
      if (this.linkRelMap[parameters.rel]) {
        input.metadata.add(this.linkRelMap[parameters.rel], namedNode(target));
      }
    }
  }
}
