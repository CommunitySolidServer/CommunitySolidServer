import type { AuxiliaryStrategy } from '../ldp/auxiliary/AuxiliaryStrategy';
import type { PermissionSet } from '../ldp/permissions/Permissions';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';

import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';

/**
 * A PermissionReader for auxiliary resources such as acl or shape resources.
 * By default, the access permissions of an auxiliary resource depend on those of its subject resource.
 * This authorizer calls the source authorizer with the identifier of the subject resource.
 */
export class AuxiliaryReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceReader: PermissionReader;
  private readonly auxiliaryStrategy: AuxiliaryStrategy;

  public constructor(resourceReader: PermissionReader, auxiliaryStrategy: AuxiliaryStrategy) {
    super();
    this.resourceReader = resourceReader;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async canHandle(auxiliaryAuth: PermissionReaderInput): Promise<void> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    return this.resourceReader.canHandle(resourceAuth);
  }

  public async handle(auxiliaryAuth: PermissionReaderInput): Promise<PermissionSet> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} on ${resourceAuth.identifier.path}`);
    return this.resourceReader.handle(resourceAuth);
  }

  public async handleSafe(auxiliaryAuth: PermissionReaderInput): Promise<PermissionSet> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} to ${resourceAuth.identifier.path}`);
    return this.resourceReader.handleSafe(resourceAuth);
  }

  private getRequiredAuthorization(auxiliaryAuth: PermissionReaderInput): PermissionReaderInput {
    if (!this.auxiliaryStrategy.isAuxiliaryIdentifier(auxiliaryAuth.identifier)) {
      throw new NotImplementedHttpError('AuxiliaryAuthorizer only supports auxiliary resources.');
    }

    if (this.auxiliaryStrategy.usesOwnAuthorization(auxiliaryAuth.identifier)) {
      throw new NotImplementedHttpError('Auxiliary resource uses its own permissions.');
    }

    return {
      ...auxiliaryAuth,
      identifier: this.auxiliaryStrategy.getSubjectIdentifier(auxiliaryAuth.identifier),
    };
  }
}
