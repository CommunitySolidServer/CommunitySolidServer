import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import type { PodStore } from '../identity/interaction/pod/util/PodStore';
import { getLoggerFor } from '../logging/LogUtil';
import type { StorageLocationStrategy } from '../server/description/StorageLocationStrategy';
import { filter } from '../util/IterableUtil';
import { IdentifierMap } from '../util/map/IdentifierMap';
import type { Credentials } from '../authentication/Credentials';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AclPermissionSet } from './permissions/AclPermissionSet';
import type { PermissionSetWithComparisons } from './permissions/ComparisonPermissions';
import { COMPARISON_PERMISSIONS } from './permissions/ComparisonPermissions';
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

    const { credentials, credentialsToCompare } = input;
    // If neither the primary credentials nor any comparison credentials have a WebID,
    // no ownership grant is possible for anyone, so there is nothing to do.
    const anyWebId = credentials.agent?.webId ??
      credentialsToCompare?.find((cred): boolean => Boolean(cred.agent?.webId))?.agent?.webId;
    if (!anyWebId) {
      this.logger.debug(`No WebId found for an ownership check on the pod.`);
      return result;
    }

    // The pod owners are resolved ONCE per pod and reused for every credential set being evaluated.
    const pods = await this.findPods(auths);
    const owners = await this.findOwners(Object.values(pods));

    for (const auth of auths) {
      const webIds = owners[pods[auth.path]];
      if (!webIds) {
        continue;
      }
      const primarySet = this.grantIfOwner(auth, webIds, credentials);
      const comparisonSets = credentialsToCompare
        ?.map((cred): AclPermissionSet => this.grantIfOwner(auth, webIds, cred) ?? {});
      // An entry is created when the primary credentials are an owner (matching the original behaviour
      // exactly), OR when a comparison credential set is an owner (so its owner grant is not silently
      // dropped). When only a comparison is an owner, the primary set is an empty `{}`, which the
      // UnionPermissionReader treats as no contribution for the primary - identical to the original.
      const comparisonOwner = comparisonSets?.some((set): boolean => Boolean(set.control));
      if (primarySet ?? comparisonOwner) {
        const entry: AclPermissionSet = primarySet ?? {};
        if (comparisonSets) {
          (entry as PermissionSetWithComparisons)[COMPARISON_PERMISSIONS] = comparisonSets;
        }
        result.set(auth, entry);
      }
    }
    return result;
  }

  /**
   * Returns the full owner permission set if the given credentials belong to an owner of the resource,
   * or `undefined` otherwise.
   */
  private grantIfOwner(
    auth: { path: string },
    ownerWebIds: string[],
    credentials: Credentials,
  ): AclPermissionSet | undefined {
    const webId = credentials.agent?.webId;
    if (webId && ownerWebIds.includes(webId)) {
      this.logger.debug(`Granting Control permissions to owner on ${auth.path}`);
      return {
        read: true,
        write: true,
        append: true,
        create: true,
        delete: true,
        control: true,
      };
    }
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
