import { Representation } from './Representation';
import { ResourceIdentifier } from './ResourceIdentifier';

/**
 * A {@link Representation} with an identifier.
 */
export interface NamedRepresentation extends Representation {
  /**
   * The identifier of this representation.
   */
  identifier?: ResourceIdentifier;
}
