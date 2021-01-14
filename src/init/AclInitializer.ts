import { promises as fsPromises } from 'fs';
import type { AclManager } from '../authorization/AclManager';
import { BasicRepresentation } from '../ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { containsResource } from '../storage/StoreUtil';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { ensureTrailingSlash, joinFilePath } from '../util/PathUtil';
import { Initializer } from './Initializer';

/**
 * Ensures that a root ACL is present.
 */
export class AclInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);
  private readonly store: ResourceStore;
  private readonly aclManager: AclManager;
  private readonly root: ResourceIdentifier;

  public constructor(
    baseUrl: string,
    store: ResourceStore,
    aclManager: AclManager,
  ) {
    super();
    this.store = store;
    this.aclManager = aclManager;
    this.root = { path: ensureTrailingSlash(baseUrl) };
  }

  public async handle(): Promise<void> {
    const rootAcl = await this.aclManager.getAclDocument(this.root);
    if (!await containsResource(this.store, rootAcl)) {
      await this.setRootAclDocument(rootAcl);
    } else {
      this.logger.debug(`Existing root ACL document found at ${rootAcl.path}`);
    }
  }

  // Solid, §4.1: "The root container (pim:Storage) MUST have an ACL auxiliary resource directly associated to it.
  // The associated ACL document MUST include an authorization policy with acl:Control access privilege."
  // https://solid.github.io/specification/protocol#storage
  protected async setRootAclDocument(rootAcl: ResourceIdentifier): Promise<void> {
    const acl = await fsPromises.readFile(joinFilePath(__dirname, '../../templates/root/.acl'), 'utf8');
    this.logger.debug(`Installing root ACL document at ${rootAcl.path}`);
    await this.store.setRepresentation(rootAcl, new BasicRepresentation(acl, rootAcl, TEXT_TURTLE));
  }
}
