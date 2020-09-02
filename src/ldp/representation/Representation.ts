import { Readable } from 'stream';
import { RepresentationMetadata } from './RepresentationMetadata';

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
