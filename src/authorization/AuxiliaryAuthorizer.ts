import type { AuxiliaryIdentifierStrategy } from '../ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Authorization } from './Authorization';
import type { AuthorizerInput } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * An authorizer for auxiliary resources such as acl or shape resources.
 * The access permissions of an auxiliary resource depend on those of the resource it is associated with.
 * This authorizer calls the source authorizer with the identifier of the associated resource.
 */
export class AuxiliaryAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceAuthorizer: Authorizer;
  private readonly auxiliaryStrategy: AuxiliaryIdentifierStrategy;

  public constructor(resourceAuthorizer: Authorizer, auxiliaryStrategy: AuxiliaryIdentifierStrategy) {
    super();
    this.resourceAuthorizer = resourceAuthorizer;
    this.auxiliaryStrategy = auxiliaryStrategy;
  }

  public async canHandle(auxiliaryAuth: AuthorizerInput): Promise<void> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    return this.resourceAuthorizer.canHandle(resourceAuth);
  }

  public async handle(auxiliaryAuth: AuthorizerInput): Promise<Authorization> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} on ${resourceAuth.identifier.path}`);
    return this.resourceAuthorizer.handle(resourceAuth);
  }

  public async handleSafe(auxiliaryAuth: AuthorizerInput): Promise<Authorization> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} to ${resourceAuth.identifier.path}`);
    return this.resourceAuthorizer.handleSafe(resourceAuth);
  }

  private getRequiredAuthorization(auxiliaryAuth: AuthorizerInput): AuthorizerInput {
    if (!this.auxiliaryStrategy.isAuxiliaryIdentifier(auxiliaryAuth.identifier)) {
      throw new NotImplementedHttpError('AuxiliaryAuthorizer only supports auxiliary resources.');
    }
    return {
      ...auxiliaryAuth,
      identifier: this.auxiliaryStrategy.getAssociatedIdentifier(auxiliaryAuth.identifier),
    };
  }
}
