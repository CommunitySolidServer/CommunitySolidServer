import type { Credentials } from '../authentication/Credentials';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { AccountSettings, AccountStore } from '../identity/interaction/email-password/storage/AccountStore';
import { getLoggerFor } from '../logging/LogUtil';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { filter } from '../util/IterableUtil';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AclPermissionSet } from './permissions/AclPermissionSet';
import type { PermissionMap } from './permissions/Permissions';

/**
 * Allows control access if the request is being made by the owner of the pod containing the resource.
 */
export class OwnerPermissionReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly accountStore: AccountStore;
  private readonly authStrategy: AuxiliaryIdentifierStrategy;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(accountStore: AccountStore, authStrategy: AuxiliaryIdentifierStrategy,
    identifierStrategy: IdentifierStrategy) {
    super();
    this.accountStore = accountStore;
    this.authStrategy = authStrategy;
    this.identifierStrategy = identifierStrategy;
  }

  public async handle(input: PermissionReaderInput): Promise<PermissionMap> {
    const result: PermissionMap = new IdentifierMap();
    const requestedResources = input.requestedModes.distinctKeys();
    const auths = [ ...filter(requestedResources, (id): boolean => this.authStrategy.isAuxiliaryIdentifier(id)) ];
    if (auths.length === 0) {
      this.logger.debug(`No authorization resources found that need an ownership check.`);
      return result;
    }

    let podBaseUrl: ResourceIdentifier;
    try {
      podBaseUrl = await this.findPodBaseUrl(input.credentials);
    } catch (error: unknown) {
      this.logger.debug(`No pod owner Control permissions: ${createErrorMessage(error)}`);
      return result;
    }

    for (const auth of auths) {
      if (this.identifierStrategy.contains(podBaseUrl, auth, true)) {
        this.logger.debug(`Granting Control permissions to owner on ${auth.path}`);
        result.set(auth, {
          read: true,
          write: true,
          append: true,
          create: true,
          delete: true,
          control: true,
        } as AclPermissionSet);
      }
    }
    return result;
  }

  /**
   * Find the base URL of the pod the given credentials own.
   * Will throw an error if none can be found.
   */
  private async findPodBaseUrl(credentials: Credentials): Promise<ResourceIdentifier> {
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
    return { path: settings.podBaseUrl };
  }
}
