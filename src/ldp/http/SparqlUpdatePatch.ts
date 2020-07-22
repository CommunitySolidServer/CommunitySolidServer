import { Patch } from './Patch';
import { Update } from 'sparqlalgebrajs/lib/algebra';

/**
 * A specific type of {@link Patch} corresponding to a SPARQL update.
 */
export interface SparqlUpdatePatch extends Patch {
  /**
   * Algebra corresponding to the SPARQL update.
   */
  algebra: Update;
}
