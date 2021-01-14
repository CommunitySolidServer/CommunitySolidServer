import type { AclManager } from '../authorization/AclManager';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { ensureTrailingSlash } from '../util/PathUtil';
import { Initializer } from './Initializer';

/**
 * Ensures that a root ACL is present.
 */
export class AclInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);
  private readonly store: ResourceStore;
  private readonly aclManager: AclManager;
  private readonly baseUrl: string;

  public constructor(
    baseUrl: string,
    store: ResourceStore,
    aclManager: AclManager,
  ) {
    super();
    this.baseUrl = ensureTrailingSlash(baseUrl);
    this.store = store;
    this.aclManager = aclManager;
  }

  public async handle(): Promise<void> {
    const rootAcl = await this.aclManager.getAclDocument({ path: this.baseUrl });
    if (!await this.hasRootAclDocument(rootAcl)) {
      await this.setRootAclDocument(rootAcl);
    }
  }

  protected async hasRootAclDocument(rootAcl: ResourceIdentifier): Promise<boolean> {
    try {
      const result = await this.store.getRepresentation(rootAcl, {});
      this.logger.debug(`Existing root ACL document found at ${rootAcl.path}`);
      result.data.destroy();
      return true;
    } catch (error: unknown) {
      if (error instanceof NotFoundHttpError) {
        return false;
      }
      throw error;
    }
  }

  // Set up ACL so everything can still be done by default
  // Note that this will need to be adapted to go through all the correct channels later on
  //
  // Solid, §4.1: "The root container (pim:Storage) MUST have an ACL auxiliary resource directly associated to it.
  // The associated ACL document MUST include an authorization policy with acl:Control access privilege."
  // https://solid.github.io/specification/protocol#storage
  protected async setRootAclDocument(rootAcl: ResourceIdentifier): Promise<void> {
    const acl = `@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.
@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.

<#authorization>
    a               acl:Authorization;
    acl:agentClass  foaf:Agent;
    acl:mode        acl:Read;
    acl:mode        acl:Write;
    acl:mode        acl:Append;
    acl:mode        acl:Delete;
    acl:mode        acl:Control;
    acl:accessTo    <${this.baseUrl}>;
    acl:default     <${this.baseUrl}>.`;
    this.logger.debug(`Installing root ACL document at ${rootAcl.path}`);
    await this.store.setRepresentation(rootAcl, new BasicRepresentation(acl, rootAcl, TEXT_TURTLE));
  }
}
