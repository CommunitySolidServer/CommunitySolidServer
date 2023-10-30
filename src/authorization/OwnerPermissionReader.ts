import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { PodStore } from '../identity/interaction/pod/util/PodStore';
import { getLoggerFor } from '../logging/LogUtil';
import type { StorageLocationStrategy } from '../server/description/StorageLocationStrategy';
import { filter } from '../util/IterableUtil';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AclPermissionSet } from './permissions/AclPermissionSet';
import type { PermissionMap } from './permissions/Permissions';

/**
 * Allows control access if the request is being made by an owner of the pod containing the resource.
 */
export class OwnerPermissionReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly podStore: PodStore;
  private readonly authStrategy: AuxiliaryIdentifierStrategy;
  private readonly storageStrategy: StorageLocationStrategy;

  public constructor(
    podStore: PodStore,
    authStrategy: AuxiliaryIdentifierStrategy,
    storageStrategy: StorageLocationStrategy,
  ) {
    super();
    this.podStore = podStore;
    this.authStrategy = authStrategy;
    this.storageStrategy = storageStrategy;
  }

  public async handle(input: PermissionReaderInput): Promise<PermissionMap> {
    const result: PermissionMap = new IdentifierMap();
    const requestedResources = input.requestedModes.distinctKeys();
    const auths = [ ...filter(requestedResources, (id): boolean => this.authStrategy.isAuxiliaryIdentifier(id)) ];
    if (auths.length === 0) {
      this.logger.debug(`No authorization resources found that need an ownership check.`);
      return result;
    }

    const webId = input.credentials.agent?.webId;
    if (!webId) {
      this.logger.debug(`No WebId found for an ownership check on the pod.`);
      return result;
    }

    const pods = await this.findPods(auths);
    const owners = await this.findOwners(Object.values(pods));

    for (const auth of auths) {
      const webIds = owners[pods[auth.path]];
      if (!webIds) {
        continue;
      }
      if (webIds.includes(webId)) {
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
   * Finds all pods that contain the given identifiers.
   * Return value is a record where the keys are the identifiers and the values the associated pod.
   */
  protected async findPods(identifiers: ResourceIdentifier[]): Promise<Record<string, string>> {
    const pods: Record<string, string> = {};
    for (const identifier of identifiers) {
      let pod: ResourceIdentifier;
      try {
        pod = await this.storageStrategy.getStorageIdentifier(identifier);
      } catch {
        this.logger.error(`Unable to find root storage for ${identifier.path}`);
        continue;
      }
      pods[identifier.path] = pod.path;
    }
    return pods;
  }

  /**
   * Finds the owners of the given pods.
   * Return value is a record where the keys are the pods and the values are all the WebIDs that own this pod.
   */
  protected async findOwners(pods: string[]): Promise<Record<string, string[]>> {
    const owners: Record<string, string[]> = {};
    // Set to only have the unique values
    for (const baseUrl of new Set(pods)) {
      const pod = await this.podStore.findByBaseUrl(baseUrl);
      if (!pod) {
        this.logger.error(`Unable to find pod ${baseUrl}`);
        continue;
      }

      const podOwners = await this.podStore.getOwners(pod.id);
      if (!podOwners) {
        this.logger.error(`Unable to find owners for ${baseUrl}`);
        continue;
      }
      owners[baseUrl] = podOwners.map((owner): string => owner.webId);
    }
    return owners;
  }
}
