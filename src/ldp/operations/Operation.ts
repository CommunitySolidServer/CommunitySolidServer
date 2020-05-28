import { Representation } from '../representation/Representation';
import { RepresentationPreferences } from '../representation/RepresentationPreferences';
import { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * A single REST operation.
 */
export interface Operation {
  /**
   * The HTTP method (GET/POST/PUT/PATCH/DELETE/etc.).
   */
  method: string;
  /**
   * Identifier of the target.
   */
  target: ResourceIdentifier;
  /**
   * Representation preferences of the response. Will be empty if there are none.
   */
  preferences: RepresentationPreferences;
  /**
   * Optional representation of the body.
   */
  body?: Representation;
}
