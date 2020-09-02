import { Quad, Store, Term } from 'n3';
import { Credentials } from '../authentication/Credentials';
import { PermissionSet } from '../ldp/permissions/PermissionSet';
import { Representation } from '../ldp/representation/Representation';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ContainerManager } from '../storage/ContainerManager';
import { ResourceStore } from '../storage/ResourceStore';
import { INTERNAL_QUADS } from '../util/ContentTypes';
import { ForbiddenHttpError } from '../util/errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { UnauthorizedHttpError } from '../util/errors/UnauthorizedHttpError';
import { ACL, FOAF } from './AclConstants';
import { AclManager } from './AclManager';
import { Authorizer, AuthorizerArgs } from './Authorizer';

/**
 * Handles most web access control predicates such as
 * `acl:mode`, `acl:agentClass`, `acl:agent`, `acl:default` and `acl:accessTo`.
 * Does not support `acl:agentGroup`, `acl:origin` and `acl:trustedApp` yet.
 */
export class WebAclAuthorizer extends Authorizer {
  private readonly aclManager: AclManager;
  private readonly containerManager: ContainerManager;
  private readonly resourceStore: ResourceStore;

  public constructor(aclManager: AclManager, containerManager: ContainerManager, resourceStore: ResourceStore) {
    super();
    this.aclManager = aclManager;
    this.containerManager = containerManager;
    this.resourceStore = resourceStore;
  }

  public async canHandle(): Promise<void> {
    // Can handle everything
  }

  /**
   * Checks if an agent is allowed to execute the requested actions.
   * Will throw an error if this is not the case.
   * @param input - Relevant data needed to check if access can be granted.
   */
  public async handle(input: AuthorizerArgs): Promise<void> {
    const store = await this.getAclRecursive(input.identifier);
    if (await this.aclManager.isAcl(input.identifier)) {
      this.checkPermission(input.credentials, store, 'control');
    } else {
      (Object.keys(input.permissions) as (keyof PermissionSet)[]).forEach((key): void => {
        if (input.permissions[key]) {
          this.checkPermission(input.credentials, store, key);
        }
      });
    }
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
    const auths = store.getQuads(null, ACL.mode, modeString, null).map((quad: Quad): Term => quad.subject);
    if (!auths.some((term): boolean => this.hasAccess(agent, term, store))) {
      throw typeof agent.webID === 'string' ? new ForbiddenHttpError() : new UnauthorizedHttpError();
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
    if (typeof agent.webID !== 'string') {
      return false;
    }
    if (store.countQuads(auth, ACL.agentClass, FOAF.AuthenticatedAgent, null) > 0) {
      return true;
    }
    return store.countQuads(auth, ACL.agent, agent.webID, null) > 0;
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
    try {
      const acl = await this.aclManager.getAcl(id);
      const data = await this.resourceStore.getRepresentation(acl, { type: [{ value: INTERNAL_QUADS, weight: 1 }]});
      return this.filterData(data, recurse ? ACL.default : ACL.accessTo, id.path);
    } catch (error) {
      if (!(error instanceof NotFoundHttpError)) {
        throw error;
      }

      const parent = await this.containerManager.getContainer(id);
      return this.getAclRecursive(parent, true);
    }
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
