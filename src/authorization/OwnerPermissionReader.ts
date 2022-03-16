import type { Credentials } from '../authentication/Credentials';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { AccountStore } from '../identity/interaction/account/util/AccountStore';
import type { WebIdStore } from '../identity/interaction/webid/util/WebIdStore';
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

  private readonly webIdStore: WebIdStore;
  private readonly accountStore: AccountStore;
  private readonly authStrategy: AuxiliaryIdentifierStrategy;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(webIdStore: WebIdStore, accountStore: AccountStore, authStrategy: AuxiliaryIdentifierStrategy,
    identifierStrategy: IdentifierStrategy) {
    super();
    this.webIdStore = webIdStore;
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

    let podBaseUrls: ResourceIdentifier[];
    try {
      podBaseUrls = await this.findPodBaseUrls(input.credentials);
    } catch (error: unknown) {
      this.logger.debug(`No pod owner Control permissions: ${createErrorMessage(error)}`);
      return result;
    }

    for (const auth of auths) {
      if (podBaseUrls.some((podBaseUrl): boolean => this.identifierStrategy.contains(podBaseUrl, auth, true))) {
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
  private async findPodBaseUrls(credentials: Credentials): Promise<ResourceIdentifier[]> {
    if (!credentials.agent?.webId) {
      throw new NotImplementedHttpError('Only authenticated agents could be owners');
    }

    const accountIds = await this.webIdStore.get(credentials.agent.webId);
    if (accountIds.length === 0) {
      throw new NotImplementedHttpError('No account is linked to this WebID');
    }

    const baseUrls: ResourceIdentifier[] = [];
    for (const accountId of accountIds) {
      const account = await this.accountStore.get(accountId);
      if (!account) {
        this.logger.error(`Found invalid account ID ${accountId} through WebID ${credentials.agent.webId}`);
        continue;
      }
      baseUrls.push(...Object.keys(account.pods).map((pod): ResourceIdentifier => ({ path: pod })));
    }

    return baseUrls;
  }
}
