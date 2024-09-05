import type { Store, Term } from 'n3';
import { AsyncHandler } from 'asynchronous-handlers';
import type { Credentials } from '../../authentication/Credentials';

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
   * Credentials of the entity that wants to use the resource.
   */
  credentials: Credentials;
}
