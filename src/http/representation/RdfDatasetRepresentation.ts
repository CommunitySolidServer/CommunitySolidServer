import type { Store } from 'n3';
import type { Representation } from './Representation';

/**
 * A {@link Representation} that contains an RDF/JS Dataset instead of a raw data stream.
 */
export interface RdfDatasetRepresentation extends Representation {
  /**
   * In {@link RdfDatasetRepresentation}, there is no data stream.
   */
  data: never;
  /**
   * The data of this representation which conforms to the RDF/JS Dataset interface
   * (https://rdf.js.org/dataset-spec/#dataset-interface).
   */
  dataset: Store;
}
