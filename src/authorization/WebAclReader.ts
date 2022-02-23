import type { Quad, Term } from 'n3';
import { Store } from 'n3';
import { CredentialGroup } from '../authentication/Credentials';
import type { Credential, CredentialSet } from '../authentication/Credentials';
import type { AuxiliaryIdentifierStrategy } from '../http/auxiliary/AuxiliaryIdentifierStrategy';
import type { Representation } from '../http/representation/Representation';
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
import { AccessMode } from './permissions/Permissions';
import type { PermissionSet } from './permissions/Permissions';

const modesMap: Record<string, keyof AclPermission> = {
  [ACL.Read]: AccessMode.read,
  [ACL.Write]: AccessMode.write,
  [ACL.Append]: AccessMode.append,
  [ACL.Control]: AclMode.control,
} as const;

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
  public async handle({ identifier, credentials }: PermissionReaderInput):
  Promise<PermissionSet> {
    // Determine the required access modes
    this.logger.debug(`Retrieving permissions of ${credentials.agent?.webId} for ${identifier.path}`);

    const isAcl = this.aclStrategy.isAuxiliaryIdentifier(identifier);
    const mainIdentifier = isAcl ? this.aclStrategy.getSubjectIdentifier(identifier) : identifier;

    // Determine the full authorization for the agent granted by the applicable ACL.
    // Note that we don't filter on input modes as all results are needed for the WAC-Allow header.
    const acl = await this.getAclRecursive(mainIdentifier);
    return this.createPermissions(credentials, acl, isAcl);
  }

  /**
   * Creates an Authorization object based on the quads found in the ACL.
   * @param credentials - Credentials to check permissions for.
   * @param acl - Store containing all relevant authorization triples.
   * @param isAcl - If the target resource is an acl document.
   */
  private async createPermissions(credentials: CredentialSet, acl: Store, isAcl: boolean):
  Promise<PermissionSet> {
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
        for (const { value: mode } of modes) {
          if (mode in modesMap) {
            aclPermissions[modesMap[mode]] = true;
          }
        }
      }
    }

    if (aclPermissions.write) {
      // Write permission implies Append permission
      aclPermissions.append = true;
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
   * Returns the ACL triples that are relevant for the given identifier.
   * These can either be from a corresponding ACL document or an ACL document higher up with defaults.
   * Rethrows any non-NotFoundHttpErrors thrown by the ResourceStore.
   * @param id - ResourceIdentifier of which we need the ACL triples.
   * @param recurse - Only used internally for recursion.
   *
   * @returns A store containing the relevant ACL triples.
   */
  private async getAclRecursive(id: ResourceIdentifier, recurse?: boolean): Promise<Store> {
    // Obtain the direct ACL document for the resource, if it exists
    this.logger.debug(`Trying to read the direct ACL document of ${id.path}`);
    try {
      const acl = this.aclStrategy.getAuxiliaryIdentifier(id);
      this.logger.debug(`Trying to read the ACL document ${acl.path}`);
      const data = await this.aclStore.getRepresentation(acl, { type: { [INTERNAL_QUADS]: 1 }});
      this.logger.info(`Reading ACL statements from ${acl.path}`);

      return await this.filterData(data, recurse ? ACL.default : ACL.accessTo, id.path);
    } catch (error: unknown) {
      if (NotFoundHttpError.isInstance(error)) {
        this.logger.debug(`No direct ACL document found for ${id.path}`);
      } else {
        const message = `Error reading ACL for ${id.path}: ${createErrorMessage(error)}`;
        this.logger.error(message);
        throw new InternalServerError(message, { cause: error });
      }
    }

    // Obtain the applicable ACL of the parent container
    this.logger.debug(`Traversing to the parent of ${id.path}`);
    if (this.identifierStrategy.isRootContainer(id)) {
      this.logger.error(`No ACL document found for root container ${id.path}`);
      // Solid, §10.1: "In the event that a server can’t apply an ACL to a resource, it MUST deny access."
      // https://solid.github.io/specification/protocol#web-access-control
      throw new ForbiddenHttpError('No ACL document found for root container');
    }
    const parent = this.identifierStrategy.getParentContainer(id);
    return this.getAclRecursive(parent, true);
  }

  /**
   * Finds all triples in the data stream of the given representation that use the given predicate and object.
   * Then extracts the unique subjects from those triples,
   * and returns a Store containing all triples from the data stream that have such a subject.
   *
   * This can be useful for finding the `acl:Authorization` objects corresponding to a specific URI
   * and returning all relevant information on them.
   * @param data - Representation with data stream of internal/quads.
   * @param predicate - Predicate to match.
   * @param object - Object to match.
   *
   * @returns A store containing the relevant triples.
   */
  private async filterData(data: Representation, predicate: string, object: string): Promise<Store> {
    // Import all triples from the representation into a queryable store
    const quads = await readableToQuads(data.data);

    // Find subjects that occur with a given predicate/object, and collect all their triples
    const subjectData = new Store();
    const subjects = quads.getQuads(null, predicate, object, null).map((quad: Quad): Term => quad.subject);
    subjects.forEach((subject): any => subjectData.addQuads(quads.getQuads(subject, null, null, null)));
    return subjectData;
  }
}
