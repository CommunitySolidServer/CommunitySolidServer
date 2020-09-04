import streamifyArray from 'streamify-array';
import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  BasePermissionsExtractor,
  BodyParser,
  CompositeAsyncHandler,
  ExpressHttpServer,
  HttpHandler,
  HttpRequest,
  Operation,
  PatchingStore,
  QuadToTurtleConverter,
  Representation,
  RepresentationConvertingStore,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
  ServerConfig,
  SingleThreadedResourceLocker,
  SparqlPatchPermissionsExtractor,
  TurtleToQuadConverter,
} from '..';
import { UnsecureWebIdExtractor } from '../src/authentication/UnsecureWebIdExtractor';
import { AllowEverythingAuthorizer } from '../src/authorization/AllowEverythingAuthorizer';
import { UrlBasedAclManager } from '../src/authorization/UrlBasedAclManager';
import { BasicRequestParser } from '../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../src/ldp/http/BasicTargetExtractor';
import { RawBodyParser } from '../src/ldp/http/RawBodyParser';
import { SparqlUpdateBodyParser } from '../src/ldp/http/SparqlUpdateBodyParser';
import { DeleteOperationHandler } from '../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../src/ldp/operations/GetOperationHandler';
import { PatchOperationHandler } from '../src/ldp/operations/PatchOperationHandler';
import { PostOperationHandler } from '../src/ldp/operations/PostOperationHandler';
import { PutOperationHandler } from '../src/ldp/operations/PutOperationHandler';
import { InMemoryResourceStore } from '../src/storage/InMemoryResourceStore';
import { SparqlUpdatePatchHandler } from '../src/storage/patch/SparqlUpdatePatchHandler';

export class SimpleHandlersTestConfig implements ServerConfig {
  public base: string;
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.base = `http://test.com/`;
    this.store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
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
    const bodyParser: BodyParser = new CompositeAsyncHandler<HttpRequest, Representation | undefined>([
      new SparqlUpdateBodyParser(),
      new RawBodyParser(),
    ]);
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser,
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new BasePermissionsExtractor(),
      new SparqlPatchPermissionsExtractor(),
    ]);
    const authorizer = new AllowEverythingAuthorizer();

    const converter = new CompositeAsyncHandler([
      new QuadToTurtleConverter(),
      new TurtleToQuadConverter(),
    ]);
    const convertingStore = new RepresentationConvertingStore(this.store, converter);
    const locker = new SingleThreadedResourceLocker();
    const patcher = new SparqlUpdatePatchHandler(convertingStore, locker);
    const patchingStore = new PatchingStore(convertingStore, patcher);

    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new GetOperationHandler(patchingStore),
      new PostOperationHandler(patchingStore),
      new DeleteOperationHandler(patchingStore),
      new PatchOperationHandler(patchingStore),
      new PutOperationHandler(patchingStore),
    ]);

    const responseWriter = new BasicResponseWriter();

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
