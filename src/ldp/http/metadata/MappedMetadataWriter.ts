import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that takes a map directly converting metadata predicates to headers.
 * The header value(s) will be the same as the corresponding object value(s).
 */
export class MappedMetadataWriter extends MetadataWriter {
  private readonly headerMap: Record<string, string>;

  public constructor(headerMap: Record<string, string>) {
    super();
    this.headerMap = headerMap;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    for (const key of Object.keys(this.headerMap)) {
      const values = input.metadata.getAll(key).map((term): string => term.value);
      if (values.length > 0) {
        addHeader(input.response, this.headerMap[key], values);
      }
    }
  }
}
