import { Representation } from './Representation';
import { TypedReadable } from '../../util/TypedReadable';

/**
 * A representation containing binary data.
 */
export interface BinaryRepresentation extends Representation {
  dataType: 'binary';
  data: TypedReadable<Buffer>;
}
