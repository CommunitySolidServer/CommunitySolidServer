import type { Readable } from 'node:stream';
import type { Guarded } from '../../util/GuardedStream';
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
  data: Guarded<Readable>;
  /**
   * Whether the data stream consists of binary/string chunks
   * (as opposed to complex objects).
   */
  binary: boolean;
  /**
   * Whether the data stream is empty.
   * This being true does not imply that the data stream has a length of more than 0,
   * only that it is a possibility and should be read to be sure.
   */
  isEmpty: boolean;
}
