import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { AuxiliaryIdentifierStrategy } from '../auxiliary/AuxiliaryIdentifierStrategy';
import type { Operation } from '../operations/Operation';
import { ModesExtractor } from './ModesExtractor';
import { AccessMode } from './PermissionSet';

export class AclModesExtractor extends ModesExtractor {
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

  public async handle(): Promise<Set<AccessMode>> {
    return new Set([ AccessMode.control ]);
  }
}
