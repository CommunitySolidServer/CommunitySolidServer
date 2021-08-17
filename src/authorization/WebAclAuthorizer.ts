import type { Quad, Term } from 'n3';
import { Store } from 'n3';
import type { Credentials } from '../authentication/Credentials';
import type { AuxiliaryIdentifierStrategy } from '../ldp/auxiliary/AuxiliaryIdentifierStrategy';
import type { PermissionSet } from '../ldp/permissions/PermissionSet';
import type { Representation } from '../ldp/representation/Representation';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { InternalServerError } from '../util/errors/InternalServerError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { UnauthorizedHttpError } from '../util/errors/UnauthorizedHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { readableToQuads } from '../util/StreamUtil';
import { ACL, RDF } from '../util/Vocabularies';
import type { AccessChecker } from './access-checkers/AccessChecker';
import type { AuthorizerArgs } from './Authorizer';
import { Authorizer } from './Authorizer';
import { WebAclAuthorization } from './WebAclAuthorization';

const modesMap: Record<string, keyof PermissionSet> = {
  [ACL.Read]: 'read',
  [ACL.Write]: 'write',
  [ACL.Append]: 'append',
  [ACL.Control]: 'control',
} as const;

/**
 * Handles authorization according to the WAC specification.
 * Specific access checks are done by the provided {@link AccessChecker}.
 */
export class WebAclAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly aclStrategy: AuxiliaryIdentifierStrategy;
  private readonly resourceStore: ResourceStore;
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly accessChecker: AccessChecker;

  public constructor(aclStrategy: AuxiliaryIdentifierStrategy, resourceStore: ResourceStore,
    identifierStrategy: IdentifierStrategy, accessChecker: AccessChecker) {
    super();
    this.aclStrategy = aclStrategy;
    this.resourceStore = resourceStore;
    this.identifierStrategy = identifierStrategy;
    this.accessChecker = accessChecker;
  }

  public async canHandle({ identifier }: AuthorizerArgs): Promise<void> {
    if (this.aclStrategy.isAuxiliaryIdentifier(identifier)) {
      throw new NotImplementedHttpError('WebAclAuthorizer does not support permissions on auxiliary resources.');
    }
  }

  /**
   * Checks if an agent is allowed to execute the requested actions.
   * Will throw an error if this is not the case.
   * @param input - Relevant data needed to check if access can be granted.
   */
  public async handle({ identifier, permissions, credentials }: AuthorizerArgs): Promise<WebAclAuthorization> {
    // Determine the required access modes
    const modes = (Object.keys(permissions) as (keyof PermissionSet)[]).filter((key): boolean => permissions[key]);
    this.logger.debug(`Checking if ${credentials.webId} has ${modes.join()} permissions for ${identifier.path}`);

    // Determine the full authorization for the agent granted by the applicable ACL
    const acl = await this.getAclRecursive(identifier);
    const authorization = await this.createAuthorization(credentials, acl);

    // Verify that the authorization allows all required modes
    for (const mode of modes) {
      this.requirePermission(credentials, authorization, mode);
    }
    this.logger.debug(`${credentials.webId} has ${modes.join()} permissions for ${identifier.path}`);
    return authorization;
  }

  /**
   * Checks whether the agent is authenticated (logged in) or not (public/anonymous).
   * @param agent - Agent whose credentials will be checked.
   */
  private isAuthenticated(agent: Credentials): agent is ({ webId: string }) {
    return typeof agent.webId === 'string';
  }

  /**
   * Creates an Authorization object based on the quads found in the ACL.
   * @param agent - Agent whose credentials will be used for the `user` field.
   * @param acl - Store containing all relevant authorization triples.
   */
  private async createAuthorization(agent: Credentials, acl: Store): Promise<WebAclAuthorization> {
    const publicPermissions = await this.determinePermissions({}, acl);
    const agentPermissions = await this.determinePermissions(agent, acl);

    return new WebAclAuthorization(agentPermissions, publicPermissions);
  }

  /**
   * Determines the available permissions for the given credentials.
   * @param credentials - Credentials to find the permissions for.
   * @param acl - Store containing all relevant authorization triples.
   */
  private async determinePermissions(credentials: Credentials, acl: Store): Promise<PermissionSet> {
    const permissions = {
      read: false,
      write: false,
      append: false,
      control: false,
    };

    // Apply all ACL rules
    const aclRules = acl.getSubjects(RDF.type, ACL.Authorization, null);
    for (const rule of aclRules) {
      const hasAccess = await this.accessChecker.handleSafe({ acl, rule, credentials });
      if (hasAccess) {
        // Set all allowed modes to true
        const modes = acl.getObjects(rule, ACL.mode, null);
        for (const { value: mode } of modes) {
          if (mode in modesMap) {
            permissions[modesMap[mode]] = true;
          }
        }
      }
    }

    if (permissions.write) {
      // Write permission implies Append permission
      permissions.append = true;
    }

    return permissions;
  }

  /**
   * Checks if the authorization grants the agent permission to use the given mode.
   * Throws a {@link ForbiddenHttpError} or {@link UnauthorizedHttpError} depending on the credentials
   * if access is not allowed.
   * @param agent - Agent that wants access.
   * @param authorization - An Authorization containing the permissions the agent has on the resource.
   * @param mode - Which mode is requested.
   */
  private requirePermission(agent: Credentials, authorization: WebAclAuthorization, mode: keyof PermissionSet): void {
    if (!authorization.user[mode]) {
      if (this.isAuthenticated(agent)) {
        this.logger.warn(`Agent ${agent.webId} has no ${mode} permissions`);
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
      const data = await this.resourceStore.getRepresentation(acl, { type: { [INTERNAL_QUADS]: 1 }});
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
