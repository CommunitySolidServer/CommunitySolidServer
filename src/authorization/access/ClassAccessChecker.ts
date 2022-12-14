import type { NamedNode } from '@rdfjs/types';
import type { AccessCheckerArgs, AccessChecks } from './AccessChecker';
import {
  accessCheckerPrivateClasses,
  accessCheckerPublicClasses,
  accessCheckerClassPredicates,
  AccessChecker,
} from './AccessChecker';

/**
 * Checks access based on the entity class.
 */
export class ClassAccessChecker extends AccessChecker {
  private readonly predicate: NamedNode;
  private readonly publicClass: NamedNode;
  private readonly privateClass: NamedNode;

  public constructor(type: AccessChecks) {
    super(type);

    this.predicate = accessCheckerClassPredicates[type];
    this.publicClass = accessCheckerPublicClasses[type];
    this.privateClass = accessCheckerPrivateClasses[type];
  }

  public async handle({ acl, rule, credentials }: AccessCheckerArgs): Promise<boolean> {
    const identity = this.getIdentity(credentials);

    // Check whether unauthenticated entities have access
    if (acl.countQuads(rule, this.predicate, this.publicClass, null) !== 0) {
      return true;
    }

    // Check whether the entity is authenticated and whether authenticated entities have access
    if (typeof identity === 'string') {
      return acl.countQuads(rule, this.predicate, this.privateClass, null) !== 0;
    }

    return false;
  }
}
