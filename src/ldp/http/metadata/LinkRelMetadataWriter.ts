import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/Util';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that takes a linking metadata predicates to Link header "rel" values.
 * The values of the objects will be put in a Link header with the corresponding "rel" value.
 */
export class LinkRelMetadataWriter extends MetadataWriter {
  private readonly linkRelMap: Record<string, string>;

  // Not supported by Components.js yet
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  public constructor(linkRelMap: { [predicate: string]: string }) {
    super();
    this.linkRelMap = linkRelMap;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    for (const key of Object.keys(this.linkRelMap)) {
      const values = input.metadata.getAll(key).map((term): string => `<${term.value}>; rel="${this.linkRelMap[key]}"`);
      if (values.length > 0) {
        addHeader(input.response, 'link', values);
      }
    }
  }
}
