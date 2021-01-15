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

const DEFAULT_ACL_PATH = joinFilePath(__dirname, '../../templates/root/.acl');
/**
 * Ensures that a root ACL is present.
 */
export class AclInitializer extends Initializer {
  protected readonly logger = getLoggerFor(this);
  private readonly store: ResourceStore;
  private readonly aclManager: AclManager;
  private readonly root: ResourceIdentifier;
  private readonly aclPath: string;

  public constructor(settings: {
    store: ResourceStore;
    aclManager: AclManager;
    baseUrl: string;
    aclPath?: string;
  }) {
    super();
    this.store = settings.store;
    this.aclManager = settings.aclManager;
    this.root = { path: ensureTrailingSlash(settings.baseUrl) };
    this.aclPath = settings.aclPath ?? DEFAULT_ACL_PATH;
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
    const acl = await fsPromises.readFile(this.aclPath, 'utf8');
    this.logger.debug(`Installing root ACL document at ${rootAcl.path}`);
    await this.store.setRepresentation(rootAcl, new BasicRepresentation(acl, rootAcl, TEXT_TURTLE));
  }
}
