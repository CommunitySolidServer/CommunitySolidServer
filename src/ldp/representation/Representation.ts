import type { Readable } from 'stream';
import type { RepresentationMetadata } from './RepresentationMetadata';

/**
 * A representation of a resource.
 */
export interface Representation {
  /**
   * The corresponding metadata.
   */
  metadata: RepresentationMetadata;
  /**
   * The raw data stream for this representation.
   */
  data: Readable;
  /**
   * Whether the data stream consists of binary/string chunks
   * (as opposed to complex objects).
   */
  binary: boolean;
}
