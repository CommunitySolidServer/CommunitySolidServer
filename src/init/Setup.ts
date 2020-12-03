import type { AclManager } from '../authorization/AclManager';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { LoggerFactory } from '../logging/LoggerFactory';
import { getLoggerFor, setGlobalLoggerFactory } from '../logging/LogUtil';
import type { HttpServerFactory } from '../server/HttpServerFactory';
import type { ResourceStore } from '../storage/ResourceStore';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { guardedStreamFrom } from '../util/StreamUtil';
import { CONTENT_TYPE } from '../util/UriConstants';

/**
 * Invokes all logic to setup a server.
 */
export class Setup {
  protected readonly logger = getLoggerFor(this);
  private readonly serverFactory: HttpServerFactory;
  private readonly store: ResourceStore;
  private readonly aclManager: AclManager;
  private readonly loggerFactory: LoggerFactory;
  private readonly base: string;
  private readonly port: number;

  public constructor(
    serverFactory: HttpServerFactory,
    store: ResourceStore,
    aclManager: AclManager,
    loggerFactory: LoggerFactory,
    base: string,
    port: number,
  ) {
    this.serverFactory = serverFactory;
    this.store = store;
    this.aclManager = aclManager;
    this.loggerFactory = loggerFactory;
    this.base = base;
    this.port = port;
  }

  /**
   * Set up a server.
   */
  public async setup(): Promise<string> {
    setGlobalLoggerFactory(this.loggerFactory);

    const rootAcl = await this.aclManager.getAclDocument({ path: this.base });
    if (!await this.hasRootAclDocument(rootAcl)) {
      await this.setRootAclDocument(rootAcl);
    }

    this.serverFactory.startServer(this.port);
    return this.base;
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
    acl:accessTo    <${this.base}>;
    acl:default     <${this.base}>.`;
    const metadata = new RepresentationMetadata(rootAcl.path, { [CONTENT_TYPE]: TEXT_TURTLE });
    this.logger.debug(`Installing root ACL document at ${rootAcl.path}`);
    await this.store.setRepresentation(
      rootAcl,
      {
        binary: true,
        data: guardedStreamFrom([ acl ]),
        metadata,
      },
    );
  }
}
