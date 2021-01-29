import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { AuxiliaryIdentifierStrategy } from '../auxiliary/AuxiliaryIdentifierStrategy';
import type { Operation } from '../operations/Operation';
import type { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';

/**
 * PermissionsExtractor specifically for acl resources.
 *
 * Solid, §4.3.3: "To discover, read, create, or modify an ACL auxiliary resource, an acl:agent MUST have
 * acl:Control privileges per the ACL inheritance algorithm on the resource directly associated with it."
 * https://solid.github.io/specification/protocol#auxiliary-resources-reserved
 */
export class AclPermissionsExtractor extends PermissionsExtractor {
  private readonly aclStrategy: AuxiliaryIdentifierStrategy;

  public constructor(aclStrategy: AuxiliaryIdentifierStrategy) {
    super();
    this.aclStrategy = aclStrategy;
  }

  public async canHandle({ target }: Operation): Promise<void> {
    if (!this.aclStrategy.isAuxiliaryIdentifier(target)) {
      throw new NotImplementedHttpError('Can only determine permissions of acl resources');
    }
  }

  public async handle(): Promise<PermissionSet> {
    return {
      read: false,
      write: false,
      append: false,
      control: true,
    };
  }
}
