import { PERMISSIONS } from '@solidlab/policy-engine';
import { getLoggerFor } from 'global-logger-factory';
import type { ResourceSet } from '../storage/ResourceSet';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import type { AuthorizerInput } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * An {@link Authorizer} that does the necessary checks to return a 404 instead of a 401/403
 * when trying to delete a non-existent resource when the client has the correct read permissions.
 *
 * In other cases, the request gets handled by the source authorizer.
 */
export class ReadDeleteAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  protected readonly source: Authorizer;
  protected readonly resourceSet: ResourceSet;
  protected readonly identifierStrategy: IdentifierStrategy;

  public constructor(source: Authorizer, resourceSet: ResourceSet, identifierStrategy: IdentifierStrategy) {
    super();
    this.source = source;
    this.resourceSet = resourceSet;
    this.identifierStrategy = identifierStrategy;
  }

  public async canHandle(input: AuthorizerInput): Promise<void> {
    return this.source.canHandle(input);
  }

  public async handle(input: AuthorizerInput): Promise<void> {
    for (const identifier of input.requestedModes.distinctKeys()) {
      if (input.requestedModes.hasEntry(identifier, PERMISSIONS.Delete) &&
        !await this.resourceSet.hasResource(identifier)) {
        this.logger.debug(`Trying to delete non-existent resource ${identifier.path}`);
        if (input.availablePermissions.get(identifier)?.[PERMISSIONS.Read]) {
          this.logger.debug(`Returning 404 as the client has read permissions on the resource`);
          throw new NotFoundHttpError();
        } else if (!this.identifierStrategy.isRootContainer(identifier) &&
          input.availablePermissions.get(this.identifierStrategy.getParentContainer(identifier))?.[PERMISSIONS.Read]) {
          this.logger.debug(`Returning 404 as the client has read permissions on the parent container`);
          throw new NotFoundHttpError();
        } else if (input.availablePermissions.has(identifier)) {
          // Remove the available delete permission so the source authorizer will throw the correct error
          input.availablePermissions.get(identifier)![PERMISSIONS.Delete] = false;
        }
      }
    }
    return this.source.handle(input);
  }
}
