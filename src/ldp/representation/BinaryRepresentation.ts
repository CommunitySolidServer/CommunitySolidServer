import { Readable } from 'stream';
import { Representation } from './Representation';

/**
 * A representation containing binary data.
 */
export interface BinaryRepresentation extends Representation {
  dataType: 'binary';
  data: Readable;
}
