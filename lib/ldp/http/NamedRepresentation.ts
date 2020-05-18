import { Representation } from './Representation';
import { ResourceIdentifier } from './ResourceIdentifier';

export interface NamedRepresentation extends Representation {
  /**
   * The identifier of this representation.
   */
  identifier?: ResourceIdentifier;
}
