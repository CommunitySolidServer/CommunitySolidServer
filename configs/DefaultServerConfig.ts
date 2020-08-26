import { DATA_TYPE_BINARY } from '../src/util/ContentTypes';
import streamifyArray from 'streamify-array';
import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  BasePermissionsExtractor,
  CompositeAsyncHandler,
  ExpressHttpServer,
  HttpHandler,
  HttpRequest,
  PatchingStore,
  QuadToTurtleConverter,
  Representation,
  RepresentationConvertingStore,
  ResourceStore,
  RuntimeConfig,
  ServerConfig,
  SimpleAclAuthorizer,
  SimpleBodyParser,
  SimpleCredentialsExtractor,
  SimpleDeleteOperationHandler,
  SimpleExtensionAclManager,
  SimpleGetOperationHandler,
  SimplePatchOperationHandler,
  SimplePostOperationHandler,
  SimplePutOperationHandler,
  SimpleRequestParser,
  SimpleResourceStore,
  SimpleResponseWriter,
  SimpleSparqlUpdateBodyParser,
  SimpleSparqlUpdatePatchHandler,
  SimpleTargetExtractor,
  SingleThreadedResourceLocker,
  SparqlPatchPermissionsExtractor,
  TurtleToQuadConverter,
  UrlContainerManager,
} from '..';

// This is the configuration from bin/server.ts

export class DefaultServerConfig implements ServerConfig {
  public base: string;
  public store: ResourceStore;
  public aclManager: AclManager;
  public runtimeConfig: RuntimeConfig;

  public constructor() {
    this.base = `http://localhost:3000/`;
    this.runtimeConfig = new RuntimeConfig();
    this.store = new SimpleResourceStore(this.runtimeConfig);
    this.aclManager = new SimpleExtensionAclManager();
  }

  public async getHttpServer(): Promise<ExpressHttpServer> {
    const httpServer = new ExpressHttpServer(this.getHandler());

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
      await this.store.setRepresentation(
        await this.aclManager.getAcl({ path: this.base }),
        {
          dataType: DATA_TYPE_BINARY,
          data: streamifyArray([ acl ]),
          metadata: {
            raw: [],
            profiles: [],
            contentType: 'text/turtle',
          },
        },
      );
    };
    await aclSetup();
    return httpServer;
  }

  public getHandler(): HttpHandler {
    // This is instead of the dependency injection that still needs to be added
    const bodyParser = new CompositeAsyncHandler<HttpRequest, Representation | undefined>([
      new SimpleSparqlUpdateBodyParser(),
      new SimpleBodyParser(),
    ]);
    const requestParser = new SimpleRequestParser({
      targetExtractor: new SimpleTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser,
    });

    const credentialsExtractor = new SimpleCredentialsExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new BasePermissionsExtractor(),
      new SparqlPatchPermissionsExtractor(),
    ]);

    // Will have to see how to best handle this
    // const store = new SimpleResourceStore(this.base);
    const converter = new CompositeAsyncHandler([
      new TurtleToQuadConverter(),
      new QuadToTurtleConverter(),
    ]);
    const convertingStore = new RepresentationConvertingStore(this.store, converter);
    const locker = new SingleThreadedResourceLocker();
    const patcher = new SimpleSparqlUpdatePatchHandler(convertingStore, locker);
    const patchingStore = new PatchingStore(convertingStore, patcher);

    // Const aclManager = new SimpleExtensionAclManager();
    const containerManager = new UrlContainerManager(this.runtimeConfig);
    const authorizer = new SimpleAclAuthorizer(this.aclManager, containerManager, patchingStore);

    const operationHandler = new CompositeAsyncHandler([
      new SimpleDeleteOperationHandler(patchingStore),
      new SimpleGetOperationHandler(patchingStore),
      new SimplePatchOperationHandler(patchingStore),
      new SimplePostOperationHandler(patchingStore),
      new SimplePutOperationHandler(patchingStore),
    ]);

    const responseWriter = new SimpleResponseWriter();

    const httpHandler = new AuthenticatedLdpHandler({
      requestParser,
      credentialsExtractor,
      permissionsExtractor,
      authorizer,
      operationHandler,
      responseWriter,
    });

    return httpHandler;
  }
}
