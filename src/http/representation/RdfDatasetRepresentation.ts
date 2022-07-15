import type { Store } from 'n3';
import type { Representation } from './Representation';

export interface RdfDatasetRepresentation extends Representation {
  data: never;
  dataset: Store;
}
