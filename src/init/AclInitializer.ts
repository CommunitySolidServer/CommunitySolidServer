import { createReadStream } from 'fs';
import type { AuxiliaryIdentifierStrategy } from '../ldp/auxiliary/AuxiliaryIdentifierStrategy';
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
  private readonly aclStrategy: AuxiliaryIdentifierStrategy;
  private readonly root: ResourceIdentifier;
  private readonly aclPath: string;

  public constructor(settings: {
    store: ResourceStore;
    aclStrategy: AuxiliaryIdentifierStrategy;
    baseUrl: string;
    aclPath?: string;
  }) {
    super();
    this.store = settings.store;
    this.aclStrategy = settings.aclStrategy;
    this.root = { path: ensureTrailingSlash(settings.baseUrl) };
    this.aclPath = settings.aclPath ?? DEFAULT_ACL_PATH;
  }

  // Solid, §4.1: "The root container (pim:Storage) MUST have an ACL auxiliary resource directly associated to it.
  // The associated ACL document MUST include an authorization policy with acl:Control access privilege."
  // https://solid.github.io/specification/protocol#storage
  public async handle(): Promise<void> {
    const rootAcl = this.aclStrategy.getAuxiliaryIdentifier(this.root);
    if (await containsResource(this.store, rootAcl)) {
      this.logger.debug(`Existing root ACL document found at ${rootAcl.path}`);
    } else {
      this.logger.debug(`Installing root ACL document at ${rootAcl.path}`);
      const aclDocument = createReadStream(this.aclPath, 'utf8');
      await this.store.setRepresentation(rootAcl, new BasicRepresentation(aclDocument, rootAcl, TEXT_TURTLE));
    }
  }
}
