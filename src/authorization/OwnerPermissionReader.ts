import type { PermissionMap } from '@solidlab/policy-engine';
import { ACL } from '@solidlab/policy-engine';
import { getLoggerFor } from 'global-logger-factory';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { PodStore } from '../identity/interaction/pod/util/PodStore';
import type { StorageLocationStrategy } from '../server/description/StorageLocationStrategy';
import { filter } from '../util/IterableUtil';
import { IdentifierMap, IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import { getDefault } from '../util/map/MapUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { MultiPermissionMap } from './permissions/Permissions';

/**
 * Allows control access if the request is being made by an owner of the pod containing the resource.
 * This overrules any deductions made by the source reader:
 * if the target resource is owned by the client, they will always have control access.
 */
export class OwnerPermissionReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  protected readonly podStore: PodStore;
  protected readonly storageStrategy: StorageLocationStrategy;
  protected readonly reader: PermissionReader;

  public constructor(
    podStore: PodStore,
    storageStrategy: StorageLocationStrategy,
    reader: PermissionReader,
  ) {
    super();
    this.podStore = podStore;
    this.storageStrategy = storageStrategy;
    this.reader = reader;
  }

  public async canHandle(input: PermissionReaderInput): Promise<void> {
    return this.reader.canHandle(input);
  }

  public async handle(input: PermissionReaderInput): Promise<MultiPermissionMap> {
    const requestedResources = input.requestedModes.distinctKeys();
    const auths = [ ...filter(requestedResources, (id): boolean => input.requestedModes.hasEntry(id, ACL.Control)) ];

    const owned = await this.findOwnedResources(auths, input.credentials.agent?.webId);
    const updatedRequest = new IdentifierSetMultiMap(input.requestedModes);
    for (const identifier of owned) {
      updatedRequest.deleteEntry(identifier, ACL.Control);
    }
    let result: MultiPermissionMap;
    if (updatedRequest.size > 0) {
      result = await this.reader.handle({ requestedModes: updatedRequest, credentials: input.credentials });
    } else {
      result = new IdentifierMap();
    }
    for (const identifier of owned) {
      const permissions = getDefault(result, identifier, (): PermissionMap => ({}));
      permissions[ACL.Control] = true;
      result.set(identifier, permissions);
    }
    return result;
  }

  protected async findOwnedResources(identifiers: ResourceIdentifier[], webId?: string): Promise<ResourceIdentifier[]> {
    if (identifiers.length === 0) {
      this.logger.debug(`No resources found that need an ownership check.`);
      return [];
    }

    if (!webId) {
      this.logger.debug(`No WebId found for an ownership check on the pod.`);
      return [];
    }

    const pods = await this.findPods(identifiers);
    const owners = await this.findOwners(Object.values(pods));

    const result: ResourceIdentifier[] = [];
    for (const identifier of identifiers) {
      const webIds = owners[pods[identifier.path]];
      if (webIds?.includes(webId)) {
        result.push(identifier);
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
