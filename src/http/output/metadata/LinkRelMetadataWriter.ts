import type { NamedNode } from 'n3';
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
  private readonly linkRelMap: Map<NamedNode, string>;
  protected readonly logger = getLoggerFor(this);

  public constructor(linkRelMap: Record<string, string>) {
    super();

    this.linkRelMap = new Map<NamedNode, string>();
    for (const [ key, value ] of Object.entries(linkRelMap)) {
      this.linkRelMap.set(DataFactory.namedNode(key), value);
    }
  }

  public async handle(input: { response: HttpResponse; metadata: RepresentationMetadata }): Promise<void> {
    this.logger.debug(`Available link relations: ${this.linkRelMap.size}`);
    for (const [ predicate, relValue ] of this.linkRelMap) {
      const values = input.metadata.getAll(predicate)
        .map((term): string => `<${term.value}>; rel="${relValue}"`);
      if (values.length > 0) {
        this.logger.debug(`Adding Link header ${values.join(',')}`);
        addHeader(input.response, 'Link', values);
      }
    }
  }
}
