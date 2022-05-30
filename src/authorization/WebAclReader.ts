import { Store } from 'n3';
import type { Credential, CredentialSet } from '../authentication/Credentials';
import { CredentialGroup } from '../authentication/Credentials';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { InternalServerError } from '../util/errors/InternalServerError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { readableToQuads } from '../util/StreamUtil';
import { ACL, RDF } from '../util/Vocabularies';
import type { AccessChecker } from './access/AccessChecker';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AclPermission } from './permissions/AclPermission';
import { AclMode } from './permissions/AclPermission';
import type { PermissionSet } from './permissions/Permissions';
import { AccessMode } from './permissions/Permissions';

// Maps WebACL-specific modes to generic access modes.
const modesMap: Record<string, Readonly<(keyof AclPermission)[]>> = {
  [ACL.Read]: [ AccessMode.read ],
  [ACL.Write]: [ AccessMode.append, AccessMode.write ],
  [ACL.Append]: [ AccessMode.append ],
  [ACL.Control]: [ AclMode.control ],
} as const;

type AclSet = { targetAcl: Store; parentAcl?: Store };

/**
 * Handles permissions according to the WAC specification.
 * Specific access checks are done by the provided {@link AccessChecker}.
 */
export class WebAclReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  private readonly aclStrategy: AuxiliaryIdentifierStrategy;
  private readonly aclStore: ResourceStore;
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly accessChecker: AccessChecker;

  public constructor(aclStrategy: AuxiliaryIdentifierStrategy, aclStore: ResourceStore,
    identifierStrategy: IdentifierStrategy, accessChecker: AccessChecker) {
    super();
    this.aclStrategy = aclStrategy;
    this.aclStore = aclStore;
    this.identifierStrategy = identifierStrategy;
    this.accessChecker = accessChecker;
  }

  /**
   * Checks if an agent is allowed to execute the requested actions.
   * Will throw an error if this is not the case.
   * @param input - Relevant data needed to check if access can be granted.
   */
  public async handle({ identifier, credentials, modes }: PermissionReaderInput):
  Promise<PermissionSet> {
    // Determine the required access modes
    this.logger.debug(`Retrieving permissions of ${credentials.agent?.webId} for ${identifier.path}`);

    const isAclResource = this.aclStrategy.isAuxiliaryIdentifier(identifier);
    const mainIdentifier = isAclResource ? this.aclStrategy.getSubjectIdentifier(identifier) : identifier;

    // Adding or removing resources changes the container listing
    const requiresContainerCheck = modes.has(AccessMode.create) || modes.has(AccessMode.delete);

    // Rather than restricting the search to only the required modes,
    // we collect all modes in order to have complete metadata (for instance, for the WAC-Allow header).
    const acl = await this.getAcl(mainIdentifier, requiresContainerCheck);
    const permissions = await this.findPermissions(acl.targetAcl, credentials, isAclResource);

    if (requiresContainerCheck) {
      this.logger.debug(`Determining ${identifier.path} permissions requires verifying parent container permissions`);
      const parentPermissions = acl.targetAcl === acl.parentAcl ?
        permissions :
        await this.findPermissions(acl.parentAcl!, credentials, false);

      // https://solidproject.org/TR/2021/wac-20210711:
      // When an operation requests to create a resource as a member of a container resource,
      // the server MUST match an Authorization allowing the acl:Append or acl:Write access privilege
      // on the container for new members.
      permissions[CredentialGroup.agent]!.create = parentPermissions[CredentialGroup.agent]!.append;
      permissions[CredentialGroup.public]!.create = parentPermissions[CredentialGroup.public]!.append;

      // https://solidproject.org/TR/2021/wac-20210711:
      // When an operation requests to delete a resource,
      // the server MUST match Authorizations allowing the acl:Write access privilege
      // on the resource and the containing container.
      permissions[CredentialGroup.agent]!.delete =
        permissions[CredentialGroup.agent]!.write && parentPermissions[CredentialGroup.agent]!.write;
      permissions[CredentialGroup.public]!.delete =
        permissions[CredentialGroup.public]!.write && parentPermissions[CredentialGroup.public]!.write;
    }
    return permissions;
  }

  /**
   * Finds the permissions in the provided WebACL quads.
   * @param acl - Store containing all relevant authorization triples.
   * @param credentials - Credentials to check permissions for.
   * @param isAcl - If the target resource is an acl document.
   */
  private async findPermissions(acl: Store, credentials: CredentialSet, isAcl: boolean): Promise<PermissionSet> {
    const publicPermissions = await this.determinePermissions(acl, credentials.public);
    const agentPermissions = await this.determinePermissions(acl, credentials.agent);

    return {
      [CredentialGroup.agent]: this.updateAclPermissions(agentPermissions, isAcl),
      [CredentialGroup.public]: this.updateAclPermissions(publicPermissions, isAcl),
    };
  }

  /**
   * Determines the available permissions for the given credentials.
   * Will deny all permissions if credentials are not defined
   * @param acl - Store containing all relevant authorization triples.
   * @param credentials - Credentials to find the permissions for.
   */
  private async determinePermissions(acl: Store, credentials?: Credential): Promise<AclPermission> {
    const aclPermissions: AclPermission = {};
    if (!credentials) {
      return aclPermissions;
    }

    // Apply all ACL rules
    const aclRules = acl.getSubjects(RDF.type, ACL.Authorization, null);
    for (const rule of aclRules) {
      const hasAccess = await this.accessChecker.handleSafe({ acl, rule, credential: credentials });
      if (hasAccess) {
        // Set all allowed modes to true
        const modes = acl.getObjects(rule, ACL.mode, null);
        for (const { value: aclMode } of modes) {
          if (aclMode in modesMap) {
            for (const mode of modesMap[aclMode]) {
              aclPermissions[mode] = true;
            }
          }
        }
      }
    }

    return aclPermissions;
  }

  /**
   * Sets the correct values for non-acl permissions such as create and delete.
   * Also adds the correct values to indicate that having control permission
   * implies having read/write/etc. on the acl resource.
   *
   * The main reason for keeping the control value is so we can correctly set the WAC-Allow header later.
   */
  private updateAclPermissions(aclPermissions: AclPermission, isAcl: boolean): AclPermission {
    if (isAcl) {
      return {
        read: aclPermissions.control,
        append: aclPermissions.control,
        write: aclPermissions.control,
        create: aclPermissions.control,
        delete: aclPermissions.control,
        control: aclPermissions.control,
      };
    }
    return {
      ...aclPermissions,
      create: aclPermissions.write,
      delete: aclPermissions.write,
    };
  }

  /**
   * Finds the ACL data relevant for its resource, and potentially its parent if required.
   * All quads in the resulting store(s) can be interpreted as being relevant ACL rules for their target.
   *
   * @param target - Target to find ACL data for.
   * @param includeParent - If parent ACL data is also needed.
   *
   * @returns The relevant triples.
   */
  private async getAcl(target: ResourceIdentifier, includeParent: boolean): Promise<AclSet> {
    this.logger.debug(`Searching ACL data for ${target.path}${includeParent ? 'and its parent' : ''}`);
    const to = includeParent ? this.identifierStrategy.getParentContainer(target) : target;
    const acl = await this.getAclRecursive(target, to);

    // The only possible case where `acl` has 2 values instead of 1
    // is when the `target` has an acl, and `includeParent` is true.
    const keys = Object.keys(acl);
    if (keys.length === 2) {
      const result: AclSet = { targetAcl: await this.filterStore(acl[target.path], target.path, true) };
      // The other key will be the parent
      const parentKey = keys.find((key): boolean => key !== target.path)!;
      result.parentAcl = await this.filterStore(acl[parentKey], parentKey, parentKey === to.path);

      return result;
    }

    // Only 1 key: no parent was requested, target had no direct acl resource, or both
    const [ path, store ] = Object.entries(acl)[0];
    const result: AclSet = { targetAcl: await this.filterStore(store, path, path === target.path) };
    if (includeParent) {
      // In case the path is not the parent, it will also just use the defaults just like the target
      result.parentAcl = path === to.path ? await this.filterStore(store, path, true) : result.targetAcl;
    }

    return result;
  }

  /**
   * Finds the ACL resources from all resources in the path between the two (inclusive) identifiers.
   * It is important that `from` is a child path of `to`, otherwise behaviour is undefined.
   *
   * The result is a key/value object with the keys being the identifiers of resources in the path
   * that had a corresponding ACL resource, and the value being the contents of that ACL resource.
   *
   * The function stops after it finds an ACL resource relevant for the `to` identifier.
   * This is either its corresponding ACL resource, or one if its parent containers if such a resource does not exist.
   *
   * Rethrows any non-NotFoundHttpErrors thrown by the ResourceStore.
   * @param from - First resource in the path for which ACL data is needed.
   * @param to - Last resource in the path for which ACL data is needed.
   *
   * @returns A map with the key being the actual identifier of which the ACL was found
   * and a list of all data found within.
   */
  private async getAclRecursive(from: ResourceIdentifier, to: ResourceIdentifier): Promise<Record<string, Store>> {
    // Obtain the direct ACL document for the resource, if it exists
    this.logger.debug(`Trying to read the direct ACL document of ${from.path}`);
    const result: Record<string, Store> = {};
    try {
      const acl = this.aclStrategy.getAuxiliaryIdentifier(from);
      this.logger.debug(`Trying to read the ACL document ${acl.path}`);
      const data = await this.aclStore.getRepresentation(acl, { type: { [INTERNAL_QUADS]: 1 }});
      this.logger.info(`Reading ACL statements from ${acl.path}`);

      result[from.path] = await readableToQuads(data.data);

      if (from.path.length <= to.path.length) {
        return result;
      }
    } catch (error: unknown) {
      if (NotFoundHttpError.isInstance(error)) {
        this.logger.debug(`No direct ACL document found for ${from.path}`);
      } else {
        const message = `Error reading ACL for ${from.path}: ${createErrorMessage(error)}`;
        this.logger.error(message);
        throw new InternalServerError(message, { cause: error });
      }
    }

    // Obtain the applicable ACL of the parent container
    this.logger.debug(`Traversing to the parent of ${from.path}`);
    if (this.identifierStrategy.isRootContainer(from)) {
      this.logger.error(`No ACL document found for root container ${from.path}`);
      // Solid, §10.1: "In the event that a server can’t apply an ACL to a resource, it MUST deny access."
      // https://solid.github.io/specification/protocol#web-access-control
      throw new ForbiddenHttpError('No ACL document found for root container');
    }
    const parent = this.identifierStrategy.getParentContainer(from);
    return {
      ...result,
      ...await this.getAclRecursive(parent, to),
    };
  }

  /**
   * Extracts all rules from the store that are relevant for the given target,
   * based on either the `acl:accessTo` or `acl:default` predicates.
   * @param store - Store to filter.
   * @param target - The identifier of which the acl rules need to be known.
   * @param directAcl - If the store contains triples from the direct acl resource of the target or not.
   *                    Determines if `acl:accessTo` or `acl:default` are used.
   *
   * @returns A store containing the relevant triples for the given target.
   */
  private async filterStore(store: Store, target: string, directAcl: boolean): Promise<Store> {
    // Find subjects that occur with a given predicate/object, and collect all their triples
    const subjectData = new Store();
    const subjects = store.getSubjects(directAcl ? ACL.terms.accessTo : ACL.terms.default, target, null);
    subjects.forEach((subject): any => subjectData.addQuads(store.getQuads(subject, null, null, null)));
    return subjectData;
  }
}
