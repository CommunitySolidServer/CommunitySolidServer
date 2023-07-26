import type { Conditions } from '../storage/conditions/Conditions';
import type { Representation } from './representation/Representation';
import type { RepresentationPreferences } from './representation/RepresentationPreferences';
import type { ResourceIdentifier } from './representation/ResourceIdentifier';

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
   * Conditions the resource must fulfill for a valid operation.
   */
  conditions?: Conditions;
  /**
   * Representation of the body and metadata headers.
   */
  body: Representation;
}
