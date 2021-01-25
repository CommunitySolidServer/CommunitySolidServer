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
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnauthorizedHttpError } from '../util/errors/UnauthorizedHttpError';
import type { IdentifierStrategy } from '../util/identifiers/IdentifierStrategy';
import { ACL, FOAF } from '../util/Vocabularies';
import type { AuthorizerArgs } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * Handles most web access control predicates such as
 * `acl:mode`, `acl:agentClass`, `acl:agent`, `acl:default` and `acl:accessTo`.
 * Does not support `acl:agentGroup`, `acl:origin` and `acl:trustedApp` yet.
 */
export class WebAclAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly aclStrategy: AuxiliaryIdentifierStrategy;
  private readonly resourceStore: ResourceStore;
  private readonly identifierStrategy: IdentifierStrategy;

  public constructor(aclStrategy: AuxiliaryIdentifierStrategy, resourceStore: ResourceStore,
    identifierStrategy: IdentifierStrategy) {
    super();
    this.aclStrategy = aclStrategy;
    this.resourceStore = resourceStore;
    this.identifierStrategy = identifierStrategy;
  }

  /**
   * Checks if an agent is allowed to execute the requested actions.
   * Will throw an error if this is not the case.
   * @param input - Relevant data needed to check if access can be granted.
   */
  public async handle({ identifier, permissions, credentials }: AuthorizerArgs): Promise<void> {
    // Solid, §4.3.3: "To discover, read, create, or modify an ACL auxiliary resource, an acl:agent MUST
    // have acl:Control privileges per the ACL inheritance algorithm on the resource directly associated with it."
    // https://solid.github.io/specification/protocol#auxiliary-resources-reserved
    const modes = this.aclStrategy.isAuxiliaryIdentifier(identifier) ?
      [ 'control' ] :
      (Object.keys(permissions) as (keyof PermissionSet)[]).filter((key): boolean => permissions[key]);

    // Verify that all required modes are set for the given agent
    this.logger.debug(`Checking if ${credentials.webId} has ${modes.join()} permissions for ${identifier.path}`);
    const store = await this.getAclRecursive(identifier);
    for (const mode of modes) {
      this.checkPermission(credentials, store, mode);
    }
    this.logger.debug(`${credentials.webId} has ${modes.join()} permissions for ${identifier.path}`);
  }

  /**
   * Checks if any of the triples in the store grant the agent permission to use the given mode.
   * Throws a {@link ForbiddenHttpError} or {@link UnauthorizedHttpError} depending on the credentials
   * if access is not allowed.
   * @param agent - Agent that wants access.
   * @param store - A store containing the relevant triples for authorization.
   * @param mode - Which mode is requested. Probable one of ('write' | 'read' | 'append' | 'control').
   */
  private checkPermission(agent: Credentials, store: Store, mode: string): void {
    const modeString = ACL[this.capitalize(mode) as 'Write' | 'Read' | 'Append' | 'Control'];
    const auths = this.getModePermissions(store, modeString);

    // Having write permissions implies having append permissions
    if (modeString === ACL.Append) {
      auths.push(...this.getModePermissions(store, ACL.Write));
    }

    if (!auths.some((term): boolean => this.hasAccess(agent, term, store))) {
      const isLoggedIn = typeof agent.webId === 'string';
      if (isLoggedIn) {
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
   * Capitalizes the input string.
   * @param mode - String to transform.
   *
   * @returns The capitalized string.
   */
  private capitalize(mode: string): string {
    return `${mode[0].toUpperCase()}${mode.slice(1).toLowerCase()}`;
  }

  /**
   * Returns the identifiers of all authorizations that grant the given mode access for a resource.
   * @param store - The store containing the quads of the acl resource.
   * @param aclMode - A valid acl mode (ACL.Write/Read/...)
   */
  private getModePermissions(store: Store, aclMode: string): Term[] {
    return store.getQuads(null, ACL.mode, aclMode, null).map((quad: Quad): Term => quad.subject);
  }

  /**
   * Checks if the given agent has access to the modes specified by the given authorization.
   * @param agent - Credentials of agent that needs access.
   * @param auth - acl:Authorization that needs to be checked.
   * @param store - A store containing the relevant triples of the authorization.
   *
   * @returns If the agent has access.
   */
  private hasAccess(agent: Credentials, auth: Term, store: Store): boolean {
    if (store.countQuads(auth, ACL.agentClass, FOAF.Agent, null) > 0) {
      return true;
    }
    if (typeof agent.webId !== 'string') {
      return false;
    }
    if (store.countQuads(auth, ACL.agentClass, FOAF.AuthenticatedAgent, null) > 0) {
      return true;
    }
    return store.countQuads(auth, ACL.agent, agent.webId, null) > 0;
  }

  /**
   * Returns the acl triples that are relevant for the given identifier.
   * These can either be from a corresponding acl file or an acl file higher up with defaults.
   * Rethrows any non-NotFoundHttpErrors thrown by the AclManager or ResourceStore.
   * @param id - ResourceIdentifier of which we need the acl triples.
   * @param recurse - Only used internally for recursion.
   *
   * @returns A store containing the relevant acl triples.
   */
  private async getAclRecursive(id: ResourceIdentifier, recurse?: boolean): Promise<Store> {
    this.logger.debug(`Trying to read the direct ACL document of ${id.path}`);
    try {
      const isAcl = this.aclStrategy.isAuxiliaryIdentifier(id);
      const acl = isAcl ? id : this.aclStrategy.getAuxiliaryIdentifier(id);
      this.logger.debug(`Trying to read the ACL document ${acl.path}`);
      const data = await this.resourceStore.getRepresentation(acl, { type: { [INTERNAL_QUADS]: 1 }});
      this.logger.info(`Reading ACL statements from ${acl.path}`);

      const resourceId = isAcl ? this.aclStrategy.getAssociatedIdentifier(id) : id;
      return this.filterData(data, recurse ? ACL.default : ACL.accessTo, resourceId.path);
    } catch (error: unknown) {
      if (NotFoundHttpError.isInstance(error)) {
        this.logger.debug(`No direct ACL document found for ${id.path}`);
      } else {
        this.logger.error(`Error reading ACL for ${id.path}: ${(error as Error).message}`, { error });
        throw error;
      }
    }

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
    const store = new Store();
    const importEmitter = store.import(data.data);
    await new Promise((resolve, reject): void => {
      importEmitter.on('end', resolve);
      importEmitter.on('error', reject);
    });

    const auths = store.getQuads(null, predicate, object, null).map((quad: Quad): Term => quad.subject);
    const newStore = new Store();
    auths.forEach((subject): any => newStore.addQuads(store.getQuads(subject, null, null, null)));
    return newStore;
  }
}
