import type { NamedNode } from '@rdfjs/types';
import type { AccessCheckerArgs, AccessChecks } from './AccessChecker';
import { accessCheckerIdentityPredicates, AccessChecker } from './AccessChecker';

/**
 * Checks if the given identity has been given access.
 */
export class IdentityAccessChecker extends AccessChecker {
  private readonly predicate: NamedNode;

  public constructor(type: AccessChecks) {
    super(type);

    this.predicate = accessCheckerIdentityPredicates[type];
  }

  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    const identity = this.getIdentity(credentials);

    if (typeof identity === 'string') {
      return acl.countQuads(rule, this.predicate, identity, null) !== 0;
    }

    return false;
  }
}
