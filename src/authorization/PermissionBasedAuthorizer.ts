import type { Credentials } from '../authentication/Credentials';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceSet } from '../storage/ResourceSet';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnauthorizedHttpError } from '../util/errors/UnauthorizedHttpError';
import type { AuthorizerInput } from './Authorizer';
import { Authorizer } from './Authorizer';
import type { PermissionSet } from './permissions/Permissions';
import { AccessMode } from './permissions/Permissions';

/**
 * Authorizer that bases its decision on the output it gets from its PermissionReader.
 * For each permission it checks if the reader allows that for at least one credential type,
 * if yes, authorization is granted.
 * `undefined` values for reader results are interpreted as `false`.
 */
export class PermissionBasedAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceSet: ResourceSet;

  /**
   * The existence of the target resource determines the output status code for certain situations.
   * The provided {@link ResourceSet} will be used for that.
   *
   * @param resourceSet - {@link ResourceSet} that can verify the target resource existence.
   */
  public constructor(resourceSet: ResourceSet) {
    super();
    this.resourceSet = resourceSet;
  }

  public async handle(input: AuthorizerInput): Promise<void> {
    const { credentials, requestedModes, availablePermissions } = input;

    // Ensure all required modes are within the agent's permissions.
    for (const [ identifier, modes ] of requestedModes.entrySets()) {
      const modeString = [ ...modes ].join(',');
      this.logger.debug(
        `Checking if ${JSON.stringify(credentials)} has ${modeString} permissions for ${identifier.path}`,
      );
      const permissionSet = availablePermissions.get(identifier) ?? {};
      for (const mode of modes) {
        try {
          this.requireModePermission(credentials, permissionSet, mode);
        } catch (error: unknown) {
          await this.reportAccessError(identifier, modes, permissionSet, error);
        }
      }
      this.logger.debug(`${JSON.stringify(credentials)} has ${modeString} permissions for ${identifier.path}`);
    }
  }

  /**
   * If we know the operation will return a 404 regardless (= resource does not exist and is not being created),
   * and the agent is allowed to know about its existence (= the agent has Read permissions),
   * then immediately send the 404 here, as it makes any other agent permissions irrelevant.
   *
   * Otherwise, deny access based on existing grounds.
   */
  private async reportAccessError(
    identifier: ResourceIdentifier,
    modes: ReadonlySet<AccessMode>,
    permissionSet: PermissionSet,
    cause: unknown,
  ): Promise<never> {
    const exposeExistence = permissionSet[AccessMode.read];
    if (exposeExistence && !modes.has(AccessMode.create) && !await this.resourceSet.hasResource(identifier)) {
      throw new NotFoundHttpError();
    }

    throw cause;
  }

  /**
   * Ensures that at least one of the credentials provides permissions for the given mode.
   * Throws a {@link ForbiddenHttpError} or {@link UnauthorizedHttpError} depending on the credentials
   * if access is not allowed.
   *
   * @param credentials - Credentials that require access.
   * @param permissionSet - PermissionSet describing the available permissions of the credentials.
   * @param mode - Which mode is requested.
   */
  private requireModePermission(credentials: Credentials, permissionSet: PermissionSet, mode: AccessMode): void {
    if (!permissionSet[mode]) {
      if (this.isAuthenticated(credentials)) {
        this.logger.warn(`Agent ${JSON.stringify(credentials)} has no ${mode} permissions`);
        throw new ForbiddenHttpError();
      } else {
        // Solid, §2.1: "When a client does not provide valid credentials when requesting a resource that requires it,
        // the data pod MUST send a response with a 401 status code (unless 404 is preferred for security reasons)."
        // https://solid.github.io/specification/protocol#http-server
        this.logger.warn(`Unauthenticated agent has no ${mode} permissions`);
        throw new UnauthorizedHttpError();
      }
    }
  }

  /**
   * Checks whether the agent is authenticated (logged in) or not (public/anonymous).
   *
   * @param credentials - Credentials to check.
   */
  private isAuthenticated(credentials: Credentials): boolean {
    return Object.values(credentials).some((cred): boolean => cred !== undefined);
  }
}
