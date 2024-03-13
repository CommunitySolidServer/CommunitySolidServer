import type { Readable } from 'node:stream';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { guardedStreamFrom } from '../../util/StreamUtil';
import type { Representation } from './Representation';
import type { MetadataIdentifier, MetadataRecord } from './RepresentationMetadata';
import { isRepresentationMetadata, RepresentationMetadata } from './RepresentationMetadata';

/**
 * Class with various constructors to facilitate creating a representation.
 *
 * A representation consists of 1) data, 2) metadata, and 3) a binary flag
 * to indicate whether the data is a binary stream or an object stream.
 *
 * 1. The data can be given as a stream, array, or string.
 * 2. The metadata can be specified as one or two parameters
 *    that will be passed to the {@link RepresentationMetadata} constructor.
 * 3. The binary field is optional, and if not specified,
 *    is determined from the content type inside the metadata.
 */
export class BasicRepresentation implements Representation {
  public readonly data: Guarded<Readable>;
  public readonly metadata: RepresentationMetadata;
  public readonly binary: boolean;

  /**
   * An empty Representation
   */
  public constructor();

  /**
   * @param data - The representation data
   * @param metadata - The representation metadata
   * @param binary - Whether the representation is a binary or object stream
   */
  public constructor(
    data: Guarded<Readable> | Readable | unknown[] | string,
    metadata: RepresentationMetadata | MetadataRecord,
    binary?: boolean,
  );

  /**
   * @param data - The representation data
   * @param metadata - The representation metadata
   * @param contentType - The representation's content type
   * @param binary - Whether the representation is a binary or object stream
   */
  public constructor(
    data: Guarded<Readable> | Readable | unknown[] | string,
    metadata: RepresentationMetadata | MetadataRecord,
    contentType?: string,
    binary?: boolean,
  );

  /**
   * @param data - The representation data
   * @param contentType - The representation's content type
   * @param binary - Whether the representation is a binary or object stream
   */
  public constructor(
    data: Guarded<Readable> | Readable | unknown[] | string,
    contentType: string,
    binary?: boolean,
  );

  /**
   * @param data - The representation data
   * @param identifier - The representation's identifier
   * @param metadata - The representation metadata
   * @param binary - Whether the representation is a binary or object stream
   */
  public constructor(
    data: Guarded<Readable> | Readable | unknown[] | string,
    identifier: MetadataIdentifier,
    metadata?: MetadataRecord,
    binary?: boolean,
  );

  /**
   * @param data - The representation data
   * @param identifier - The representation's identifier
   * @param contentType - The representation's content type
   * @param binary - Whether the representation is a binary or object stream
   */
  public constructor(
    data: Guarded<Readable> | Readable | unknown[] | string,
    identifier: MetadataIdentifier,
    contentType?: string,
    binary?: boolean,
  );

  public constructor(
    data?: Readable | unknown[] | string,
    metadata?: RepresentationMetadata | MetadataRecord | MetadataIdentifier | string,
    metadataRest?: MetadataRecord | string | boolean,
    binary?: boolean,
  ) {
    if (typeof data === 'string' || Array.isArray(data)) {
      data = guardedStreamFrom(data);
    } else if (!data) {
      data = guardedStreamFrom([]);
    }
    this.data = guardStream(data);

    if (typeof metadataRest === 'boolean') {
      binary = metadataRest;
      metadataRest = undefined;
    }
    if (!isRepresentationMetadata(metadata) || typeof metadataRest === 'string') {
      // This combination will always match with a valid overload
      metadata = new RepresentationMetadata(metadata as RepresentationMetadata, metadataRest as string);
    }
    this.metadata = metadata;

    if (typeof binary !== 'boolean') {
      binary = metadata.contentType !== INTERNAL_QUADS;
    }
    this.binary = binary;
  }

  /**
   * Data should only be interpreted if there is a content type.
   */
  public get isEmpty(): boolean {
    return !this.metadata.contentType;
  }
}
