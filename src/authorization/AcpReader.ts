import { Readable } from 'node:stream';
import type { IAccessControlledResource, IContext, IPolicy } from '@solid/access-control-policy';
import { allowAccessModes } from '@solid/access-control-policy';
import type { Store } from 'n3';
import type { Credentials } from '../authentication/Credentials';
import type { AuxiliaryStrategy } from '../http/auxiliary/AuxiliaryStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { InternalServerError } from '../util/errors/InternalServerError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { IdentifierMap } from '../util/map/IdentifierMap';
import { getDefault } from '../util/map/MapUtil';
import { readableToQuads } from '../util/StreamUtil';
import { ACL } from '../util/Vocabularies';
import { getAccessControlledResources } from './AcpUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AclPermissionSet } from './permissions/AclPermissionSet';
import { AclMode } from './permissions/AclPermissionSet';
import { AccessMode } from './permissions/Permissions';
import type { PermissionMap, PermissionSet } from './permissions/Permissions';

const modesMap: Record<string, readonly (keyof AclPermissionSet)[]> = {
  [ACL.Read]: [ AccessMode.read ],
  [ACL.Write]: [ AccessMode.append, AccessMode.write ],
  [ACL.Append]: [ AccessMode.append ],
  [ACL.Control]: [ AclMode.control ],
} as const;

/**
 * Finds the permissions of a resource as defined in the corresponding ACRs.
 * Implementation based on https://solid.github.io/authorization-panel/acp-specification/.
 *
 * Caches data so no duplicate calls are made to the {@link ResourceStore} for a single request.
 */
export class AcpReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly acrStrategy: AuxiliaryStrategy;
  private readonly acrStore: ResourceStore;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(acrStrategy: AuxiliaryStrategy, acrStore: ResourceStore, identifierStrategy: IdentifierStrategy) {
    super();
    this.acrStrategy = acrStrategy;
    this.acrStore = acrStore;
    this.identifierStrategy = identifierStrategy;
  }

  public async handle({ credentials, requestedModes }: PermissionReaderInput): Promise<PermissionMap> {
    this.logger.debug(`Retrieving permissions of ${JSON.stringify(credentials)}`);
    const resourceCache = new IdentifierMap<IAccessControlledResource[]>();
    const permissionMap: PermissionMap = new IdentifierMap();

    // Resolves the targets sequentially so the `resourceCache` can be filled and reused
    for (const target of requestedModes.distinctKeys()) {
      permissionMap.set(target, await this.extractPermissions(target, credentials, resourceCache));
    }
    return permissionMap;
  }

  /**
   * Generates the allowed permissions.
   *
   * @param target - Target to generate permissions for.
   * @param credentials - Credentials that are trying to access the resource.
   * @param resourceCache - Cache used to store ACR data.
   */
  private async extractPermissions(
    target: ResourceIdentifier,
    credentials: Credentials,
    resourceCache: IdentifierMap<IAccessControlledResource[]>,
  ): Promise<PermissionSet> {
    const context = this.createContext(target, credentials);
    const policies: IPolicy[] = [];

    // Extract all the policies relevant for the target
    const identifiers = this.getAncestorIdentifiers(target);
    for (const identifier of identifiers) {
      const acrs = await getDefault(resourceCache, identifier, async(): Promise<IAccessControlledResource[]> =>
        [ ...getAccessControlledResources(await this.readAcrData(identifier)) ]);
      const size = policies.length;
      policies.push(...this.getEffectivePolicies(target, acrs));
      this.logger.debug(`Found ${policies.length - size} policies relevant for ${target.path} in ${identifier.path}`);
    }
    const modes = allowAccessModes(policies, context);

    const permissionSet: PermissionSet = {};
    for (const aclMode of modes) {
      if (aclMode in modesMap) {
        for (const mode of modesMap[aclMode]) {
          permissionSet[mode as AccessMode] = true;
        }
      }
    }
    return permissionSet;
  }

  /**
   * Creates an ACP context targeting the given identifier with the provided credentials.
   */
  private createContext(target: ResourceIdentifier, credentials: Credentials): IContext {
    return {
      target: target.path,
      agent: credentials.agent?.webId,
      client: credentials.client?.clientId,
      issuer: credentials.issuer?.url,
    };
  }

  /**
   * Returns all {@link IPolicy} found in `resources` that apply to the target identifier.
   * https://solidproject.org/TR/2022/acp-20220518#effective-policies
   */
  private* getEffectivePolicies(target: ResourceIdentifier, resources: Iterable<IAccessControlledResource>):
  Iterable<IPolicy> {
    for (const { iri, accessControlResource } of resources) {
      // Use the `accessControl` entries if the `target` corresponds to the `iri` used in the ACR.
      // If not, this means this is an ACR of a parent resource, and we need to use the `memberAccessControl` field.
      const accessControlField = iri === target.path ? 'accessControl' : 'memberAccessControl';
      yield* accessControlResource[accessControlField].flatMap((ac): IPolicy[] => ac.policy);
    }
  }

  /**
   * Returns the given identifier and all its ancestors.
   * These are all the identifiers that are relevant for determining the effective policies.
   */
  private* getAncestorIdentifiers(identifier: ResourceIdentifier): Iterable<ResourceIdentifier> {
    yield identifier;
    while (!this.identifierStrategy.isRootContainer(identifier)) {
      identifier = this.identifierStrategy.getParentContainer(identifier);
      yield identifier;
    }
  }

  /**
   * Returns the data found in the ACR corresponding to the given identifier.
   */
  private async readAcrData(identifier: ResourceIdentifier): Promise<Store> {
    const acrIdentifier = this.acrStrategy.getAuxiliaryIdentifier(identifier);
    let data: Readable;
    try {
      this.logger.debug(`Reading ACR document ${acrIdentifier.path}`);
      ({ data } = await this.acrStore.getRepresentation(acrIdentifier, { type: { [INTERNAL_QUADS]: 1 }}));
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        const message = `Error reading ACR ${acrIdentifier.path}: ${createErrorMessage(error)}`;
        this.logger.error(message);
        throw new InternalServerError(message, { cause: error });
      }
      this.logger.debug(`No direct ACR document found for ${identifier.path}`);
      data = Readable.from([]);
    }
    return readableToQuads(data);
  }
}
