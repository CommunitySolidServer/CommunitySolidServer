import type { Store, Term } from 'n3';
import type { Credential } from '../../authentication/Credentials';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * Performs an authorization check against the given acl resource.
 */
export abstract class AccessChecker extends AsyncHandler<AccessCheckerArgs, boolean> {}

export interface AccessCheckerArgs {
  /**
   *  A store containing the relevant triples of the authorization.
   */
  acl: Store;

  /**
   * Authorization rule to be processed.
   */
  rule: Term;

  /**
   * Credential of the entity that wants to use the resource.
   */
  credential: Credential;
}
