import type { HttpRequest } from '../../../server/HttpRequest';
import { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataExtractor } from './MetadataExtractor';
import type { MetadataParser } from './MetadataParser';

/**
 * MetadataExtractor that lets each of its MetadataParsers add metadata based on the HttpRequest.
 */
export class BasicMetadataExtractor extends MetadataExtractor {
  private readonly parsers: MetadataParser[];

  public constructor(parsers: MetadataParser[]) {
    super();
    this.parsers = parsers;
  }

  public async handle({ request }: { request: HttpRequest }):
  Promise<RepresentationMetadata> {
    const metadata = new RepresentationMetadata();
    for (const parser of this.parsers) {
      await parser.parse(request, metadata);
    }
    return metadata;
  }
}
