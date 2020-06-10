import { Quad } from 'rdf-js';
import { Representation } from './Representation';
import { TypedReadable } from '../../util/TypedReadable';

/**
 * A representation containing quads as data.
 */
export interface QuadRepresentation extends Representation {
  dataType: 'quad';
  data: TypedReadable<Quad>;
}
