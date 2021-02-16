import type { AuxiliaryIdentifierStrategy } from '../ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { Authorization } from './Authorization';
import type { AuthorizerArgs } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * An authorizer for auxiliary resources such as acl or shape resources.
 * The access permissions of an auxiliary resource depend on those of the resource it is associated with.
 * This authorizer calls the source authorizer with the identifier of the associated resource.
 */
export class AuxiliaryAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceAuthorizer: Authorizer;
  private readonly auxStrategy: AuxiliaryIdentifierStrategy;

  public constructor(resourceAuthorizer: Authorizer, auxStrategy: AuxiliaryIdentifierStrategy) {
    super();
    this.resourceAuthorizer = resourceAuthorizer;
    this.auxStrategy = auxStrategy;
  }

  public async canHandle(auxiliaryAuth: AuthorizerArgs): Promise<void> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    return this.resourceAuthorizer.canHandle(resourceAuth);
  }

  public async handle(auxiliaryAuth: AuthorizerArgs): Promise<Authorization> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} on ${resourceAuth.identifier.path}`);
    return this.resourceAuthorizer.handle(resourceAuth);
  }

  public async handleSafe(auxiliaryAuth: AuthorizerArgs): Promise<Authorization> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} to ${resourceAuth.identifier.path}`);
    return this.resourceAuthorizer.handleSafe(resourceAuth);
  }

  private getRequiredAuthorization(auxiliaryAuth: AuthorizerArgs): AuthorizerArgs {
    if (!this.auxStrategy.isAuxiliaryIdentifier(auxiliaryAuth.identifier)) {
      throw new NotImplementedHttpError('AuxiliaryAuthorizer only supports auxiliary resources.');
    }
    return {
      ...auxiliaryAuth,
      identifier: this.auxStrategy.getAssociatedIdentifier(auxiliaryAuth.identifier),
    };
  }
}
