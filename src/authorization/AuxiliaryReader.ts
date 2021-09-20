import type { AuxiliaryIdentifierStrategy } from '../ldp/auxiliary/AuxiliaryIdentifierStrategy';
import type { PermissionSet } from '../ldp/permissions/Permissions';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';

import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';

/**
 * A PermissionReader for auxiliary resources such as acl or shape resources.
 * The access permissions of an auxiliary resource depend on those of the resource it is associated with.
 * This authorizer calls the source authorizer with the identifier of the associated resource.
 */
export class AuxiliaryReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceReader: PermissionReader;
  private readonly auxiliaryStrategy: AuxiliaryIdentifierStrategy;

  public constructor(resourceReader: PermissionReader, auxiliaryStrategy: AuxiliaryIdentifierStrategy) {
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
    return {
      ...auxiliaryAuth,
      identifier: this.auxiliaryStrategy.getAssociatedIdentifier(auxiliaryAuth.identifier),
    };
  }
}
