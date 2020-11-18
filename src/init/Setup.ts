import type { AclManager } from '../authorization/AclManager';
import { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import type { LoggerFactory } from '../logging/LoggerFactory';
import { getLoggerFor, setGlobalLoggerFactory } from '../logging/LogUtil';
import type { ExpressHttpServerFactory } from '../server/ExpressHttpServerFactory';
import type { ResourceStore } from '../storage/ResourceStore';
import { TEXT_TURTLE } from '../util/ContentTypes';
import { guardedStreamFrom } from '../util/StreamUtil';
import { CONTENT_TYPE } from '../util/UriConstants';

/**
 * Invokes all logic to setup a server.
 */
export class Setup {
  protected readonly logger = getLoggerFor(this);
  private readonly serverFactory: ExpressHttpServerFactory;
  private readonly store: ResourceStore;
  private readonly aclManager: AclManager;
  private readonly loggerFactory: LoggerFactory;
  private readonly base: string;
  private readonly port: number;

  public constructor(
    serverFactory: ExpressHttpServerFactory,
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
    // Configure the logger factory so that others can statically call it.
    setGlobalLoggerFactory(this.loggerFactory);

    // Set up acl so everything can still be done by default
    // Note that this will need to be adapted to go through all the correct channels later on
    const aclSetup = async(): Promise<void> => {
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
      const baseAclId = await this.aclManager.getAclDocument({ path: this.base });
      const metadata = new RepresentationMetadata(baseAclId.path, { [CONTENT_TYPE]: TEXT_TURTLE });
      await this.store.setRepresentation(
        baseAclId,
        {
          binary: true,
          data: guardedStreamFrom([ acl ]),
          metadata,
        },
      );
    };
    this.logger.debug('Setup default ACL settings');
    await aclSetup();

    this.serverFactory.startServer(this.port);

    return this.base;
  }
}
