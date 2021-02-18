import type { Authorization } from '../../authorization/Authorization';
import type { Representation } from '../representation/Representation';
import type { RepresentationPreferences } from '../representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';

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
   * This value will be set if the Operation was authorized by an Authorizer.
   */
  authorization?: Authorization;
  /**
   * Optional representation of the body.
   */
  body?: Representation;
}
