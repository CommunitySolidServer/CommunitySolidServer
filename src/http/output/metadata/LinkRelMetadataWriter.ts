import { DataFactory } from 'n3';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpResponse } from '../../../server/HttpResponse';
import { addHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataWriter } from './MetadataWriter';

/**
 * A {@link MetadataWriter} that takes a linking metadata predicates to Link header "rel" values.
 * The values of the objects will be put in a Link header with the corresponding "rel" value.
 */
export class LinkRelMetadataWriter extends MetadataWriter {
  private readonly linkRelMap: Record<string, string>;
  protected readonly logger = getLoggerFor(this);

  public constructor(linkRelMap: Record<string, string>) {
    super();
    this.linkRelMap = linkRelMap;
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    const keys = Object.keys(this.linkRelMap);
    this.logger.debug(`Available link relations: ${keys.length}`);
    for (const key of keys) {
      const values = input.metadata.getAll(DataFactory.namedNode(key))
        .map((term): string => `<${term.value}>; rel="${this.linkRelMap[key]}"`);
      if (values.length > 0) {
        this.logger.debug(`Adding Link header ${values}`);
        addHeader(input.response, 'Link', values);
      }
    }
  }
}
