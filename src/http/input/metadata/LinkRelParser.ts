import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';
import type { Logger } from '../../../logging/Logger';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { HttpRequest } from '../../../server/HttpRequest';
import { parseLinkHeader } from '../../../util/HeaderUtil';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { MetadataParser } from './MetadataParser';
import namedNode = DataFactory.namedNode;
import { SOLID_META } from '../../../util/Vocabularies';

/**
 * Parses Link headers with a specific `rel` value and adds them as metadata with the given predicate.
 */
export class LinkRelParser extends MetadataParser {
  protected readonly logger = getLoggerFor(this);

  private readonly linkRelMap: Record<string, LinkRelObject>;

  public constructor(linkRelMap: Record<string, LinkRelObject>) {
    super();
    this.linkRelMap = linkRelMap;
  }

  public async handle(input: { request: HttpRequest; metadata: RepresentationMetadata }): Promise<void> {
    for (const { target, parameters } of parseLinkHeader(input.request.headers.link)) {
      this.linkRelMap[parameters.rel]?.addToMetadata(target, input.metadata, this.logger);
    }
  }
}
// Todo: integration and unit tests!!
/**
 * Represents the values that are parsed as metadata
 */
export class LinkRelObject {
  public readonly value: NamedNode;
  public readonly ephemeral: boolean;
  public readonly filter: string[];

  /**
   * @param value - The value that will be used as predicate
   * @param ephemeral - (Optional) Indicates whether it will be stored by the server
   * @param filter - (Optional) Contains the only values that can be used with the given predicate
   */
  public constructor(value: string, ephemeral?: boolean, filter?: string[]) {
    this.value = namedNode(value);
    this.ephemeral = ephemeral ?? false;
    this.filter = filter ?? [];
  }

  /**
   * Calculates whether the object can be added to the metadata
   * @param object - The link target
   * @returns a boolean to indicate whether it can be added to the metadata or not
   */
  private objectAllowed(object: string): boolean {
    return this.filter.length === 0 || this.filter.includes(object);
  }

  /**
   * Adds the object to the metadata when it is allowed
   * @param object - The link target
   * @param metadata - Metadata of the resource
   * @param logger - Logger
   */
  public addToMetadata(object: string, metadata: RepresentationMetadata, logger: Logger): void {
    if (this.objectAllowed(object)) {
      if (this.ephemeral) {
        metadata.add(this.value, namedNode(object), SOLID_META.terms.ResponseMetadata);
        logger.info(`"<${metadata.identifier.value}> <${this.value.value}> <${object}>." ` +
`will not be stored permanent into the metadata.`);
      } else {
        metadata.add(this.value, namedNode(object));
      }
    } else {
      logger.info(
        `"<${metadata.identifier.value}> <${this.value.value}> <${object}>." will not be added to the metadata`,
      );
    }
  }
}

