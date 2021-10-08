import type { Algebra } from 'sparqlalgebrajs';
import type { Patch } from './Patch';

/**
 * A specific type of {@link Patch} corresponding to a SPARQL update.
 */
export interface SparqlUpdatePatch extends Patch {
  /**
   * Algebra corresponding to the SPARQL update.
   */
  algebra: Algebra.Update;
}
