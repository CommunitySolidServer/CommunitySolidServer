import { Representation } from '../representation/Representation';
import { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * The result of executing an operation.
 */
export interface ResponseDescription {
  identifier: ResourceIdentifier;
  body?: Representation;
}
