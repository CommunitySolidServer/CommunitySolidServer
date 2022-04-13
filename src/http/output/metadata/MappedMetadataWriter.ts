import { DataFactory } from 'n3';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that takes a map directly converting metadata predicates to headers.
 * The header value(s) will be the same as the corresponding object value(s).
 */
export class MappedMetadataWriter extends MetadataWriter {
  private readonly headerMap: [string, string][];

  public constructor(headerMap: Record<string, string>) {
    super();
    this.headerMap = Object.entries(headerMap);
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    for (const [ predicate, header ] of this.headerMap) {
      const terms = input.metadata.getAll(DataFactory.namedNode(predicate));
      if (terms.length > 0) {
        addHeader(input.response, header, terms.map((term): string => term.value));
      }
    }
  }
}
