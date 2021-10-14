import { CredentialGroup } from '../authentication/Credentials';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { AccountSettings, AccountStore } from '../identity/interaction/email-password/storage/AccountStore';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AclPermission } from './permissions/AclPermission';
import type { PermissionSet } from './permissions/Permissions';

/**
 * Allows control access if the request is being made by the owner of the pod containing the resource.
 */
export class OwnerPermissionReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly aclStrategy: AuxiliaryIdentifierStrategy;

  public constructor(accountStore: AccountStore, aclStrategy: AuxiliaryIdentifierStrategy) {
    super();
    this.accountStore = accountStore;
    this.aclStrategy = aclStrategy;
  }

  public async handle(input: PermissionReaderInput): Promise<PermissionSet> {
    try {
      await this.ensurePodOwner(input);
    } catch (error: unknown) {
      this.logger.debug(`No pod owner Control permissions: ${createErrorMessage(error)}`);
      return {};
    }
    this.logger.debug(`Granting Control permissions to owner on ${input.identifier.path}`);

    return { [CredentialGroup.agent]: {
      read: true,
      write: true,
      append: true,
      create: true,
      delete: true,
      control: true,
    } as AclPermission };
  }

  /**
   * Verify that all conditions are fulfilled to give the owner access.
   */
  private async ensurePodOwner({ credentials, identifier }: PermissionReaderInput): Promise<void> {
    // We only check ownership when an ACL resource is targeted to reduce the number of storage calls
    if (!this.aclStrategy.isAuxiliaryIdentifier(identifier)) {
      throw new NotImplementedHttpError('Exception is only granted when accessing ACL resources');
    }
    if (!credentials.agent?.webId) {
      throw new NotImplementedHttpError('Only authenticated agents could be owners');
    }
    let settings: AccountSettings;
    try {
      settings = await this.accountStore.getSettings(credentials.agent.webId);
    } catch {
      throw new NotImplementedHttpError('No account registered for this WebID');
    }
    if (!settings.podBaseUrl) {
      throw new NotImplementedHttpError('This agent has no pod on the server');
    }
    if (!identifier.path.startsWith(settings.podBaseUrl)) {
      throw new NotImplementedHttpError('Not targeting the pod owned by this agent');
    }
  }
}
