import streamifyArray from 'streamify-array';
import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  BasePermissionsExtractor,
  CompositeAsyncHandler,
  ExpressHttpServer,
  HttpHandler,
  InteractionController,
  MetadataController,
  Operation,
  QuadToTurtleConverter,
  RepresentationConvertingStore,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
  ServerConfig,
  TurtleToQuadConverter,
} from '..';
import { UnsecureWebIdExtractor } from '../src/authentication/UnsecureWebIdExtractor';
import { UrlBasedAclManager } from '../src/authorization/UrlBasedAclManager';
import { WebAclAuthorizer } from '../src/authorization/WebAclAuthorizer';
import { BasicRequestParser } from '../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../src/ldp/http/BasicTargetExtractor';
import { RawBodyParser } from '../src/ldp/http/RawBodyParser';
import { DeleteOperationHandler } from '../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../src/ldp/operations/GetOperationHandler';
import { PostOperationHandler } from '../src/ldp/operations/PostOperationHandler';
import { PutOperationHandler } from '../src/ldp/operations/PutOperationHandler';
import { FileResourceStore } from '../src/storage/FileResourceStore';
import { UrlContainerManager } from '../src/storage/UrlContainerManager';

// This is the configuration from bin/server.ts

export class AuthenticatedFileResourceStoreConfig implements ServerConfig {
  public base: string;
  public store: ResourceStore;
  public aclManager: AclManager;
  public runtimeConfig: RuntimeConfig;

  public constructor() {
    this.base = `http://test.com/`;
    this.runtimeConfig = new RuntimeConfig({
      base: 'http://test.com',
      rootFilepath: 'uploads/',
    });

    const fileStore = new FileResourceStore(
      this.runtimeConfig,
      new InteractionController(),
      new MetadataController(),
    );

    const converter = new CompositeAsyncHandler([
      new QuadToTurtleConverter(),
      new TurtleToQuadConverter(),
    ]);
    this.store = new RepresentationConvertingStore(fileStore, converter);

    this.aclManager = new UrlBasedAclManager();
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
          binary: true,
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
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new BasePermissionsExtractor(),
    ]);

    const operationHandler = new CompositeAsyncHandler<
    Operation,
    ResponseDescription
    >([
      new GetOperationHandler(this.store),
      new PostOperationHandler(this.store),
      new DeleteOperationHandler(this.store),
      new PutOperationHandler(this.store),
    ]);

    const responseWriter = new BasicResponseWriter();
    const containerManager = new UrlContainerManager(this.runtimeConfig);
    const authorizer = new WebAclAuthorizer(this.aclManager, containerManager, this.store);

    const handler = new AuthenticatedLdpHandler({
      requestParser,
      credentialsExtractor,
      permissionsExtractor,
      authorizer,
      operationHandler,
      responseWriter,
    });

    return handler;
  }
}
