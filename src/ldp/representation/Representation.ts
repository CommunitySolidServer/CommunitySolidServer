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
   * The data type of the contents in the data stream.
   */
  dataType: string;
}
