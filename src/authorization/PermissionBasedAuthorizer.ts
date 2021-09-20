import type { CredentialSet } from '../authentication/Credentials';
import type { AccessMode, PermissionSet } from '../ldp/permissions/Permissions';
import { getLoggerFor } from '../logging/LogUtil';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { UnauthorizedHttpError } from '../util/errors/UnauthorizedHttpError';
import type { AuthorizerInput } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * Authorizer that bases its decision on the output it gets from its PermissionReader.
 * For each permission it checks if the reader allows that for at least one credential type,
 * if yes authorization is granted.
 * `undefined` values for reader results are interpreted as `false`.
 */
export class PermissionBasedAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  public async handle(input: AuthorizerInput): Promise<void> {
    const { credentials, modes, identifier, permissionSet } = input;

    const modeString = [ ...modes ].join(',');
    this.logger.debug(`Checking if ${credentials.agent?.webId} has ${modeString} permissions for ${identifier.path}`);

    for (const mode of modes) {
      this.requireModePermission(credentials, permissionSet, mode);
    }
    this.logger.debug(`${JSON.stringify(credentials)} has ${modeString} permissions for ${identifier.path}`);
  }

  /**
   * Ensures that at least one of the credentials provides permissions for the given mode.
   * Throws a {@link ForbiddenHttpError} or {@link UnauthorizedHttpError} depending on the credentials
   * if access is not allowed.
   * @param credentials - Credentials that require access.
   * @param permissionSet - PermissionSet describing the available permissions of the credentials.
   * @param mode - Which mode is requested.
   */
  private requireModePermission(credentials: CredentialSet, permissionSet: PermissionSet, mode: AccessMode): void {
    if (!this.hasModePermission(permissionSet, mode)) {
      if (this.isAuthenticated(credentials)) {
        this.logger.warn(`Agent ${credentials.agent!.webId} has no ${mode} permissions`);
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
   * Checks if one of the Permissions in the PermissionSet grants permission to use the given mode.
   */
  private hasModePermission(permissionSet: PermissionSet, mode: AccessMode): boolean {
    for (const permissions of Object.values(permissionSet)) {
      if (permissions[mode]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether the agent is authenticated (logged in) or not (public/anonymous).
   * @param credentials - Credentials to check.
   */
  private isAuthenticated(credentials: CredentialSet): boolean {
    return typeof credentials.agent?.webId === 'string';
  }
}
