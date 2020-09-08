import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  BodyParser,
  CompositeAsyncHandler,
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
  SingleThreadedResourceLocker,
  SparqlPatchPermissionsExtractor,
  TurtleToQuadConverter,
} from '../..';
import { UnsecureWebIdExtractor } from '../../src/authentication/UnsecureWebIdExtractor';
import { AllowEverythingAuthorizer } from '../../src/authorization/AllowEverythingAuthorizer';
import { UrlBasedAclManager } from '../../src/authorization/UrlBasedAclManager';
import { BasicRequestParser } from '../../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../../src/ldp/http/BasicTargetExtractor';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { SparqlUpdateBodyParser } from '../../src/ldp/http/SparqlUpdateBodyParser';
import { DeleteOperationHandler } from '../../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../../src/ldp/operations/GetOperationHandler';
import { PatchOperationHandler } from '../../src/ldp/operations/PatchOperationHandler';
import { PostOperationHandler } from '../../src/ldp/operations/PostOperationHandler';
import { PutOperationHandler } from '../../src/ldp/operations/PutOperationHandler';
import { MethodPermissionsExtractor } from '../../src/ldp/permissions/MethodPermissionsExtractor';
import { InMemoryResourceStore } from '../../src/storage/InMemoryResourceStore';
import { SparqlUpdatePatchHandler } from '../../src/storage/patch/SparqlUpdatePatchHandler';
import { ServerConfig } from '../configs/ServerConfig';

export class SimpleHandlersTestConfig implements ServerConfig {
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    this.aclManager = new UrlBasedAclManager();
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
      new MethodPermissionsExtractor(),
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
