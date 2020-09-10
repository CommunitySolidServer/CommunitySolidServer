import {
  AcceptPreferenceParser,
  AclManager,
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  BodyParser,
  CompositeAsyncHandler,
  DeleteOperationHandler,
  GetOperationHandler,
  HttpHandler,
  HttpRequest,
  InMemoryResourceStore,
  MethodPermissionsExtractor,
  Operation,
  PatchOperationHandler,
  PatchingStore,
  PostOperationHandler,
  PutOperationHandler,
  QuadToRdfConverter,
  RawBodyParser,
  RdfToQuadConverter,
  Representation,
  RepresentationConvertingStore,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
  SparqlUpdateBodyParser,
  SparqlUpdatePatchHandler,
  SparqlPatchPermissionsExtractor,
  SingleThreadedResourceLocker,
  UrlBasedAclManager,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from '../configs/ServerConfig';

export class BasicHandlersConfig implements ServerConfig {
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    this.aclManager = new UrlBasedAclManager();
  }

  public getHttpHandler(): HttpHandler {
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
      new QuadToRdfConverter(),
      new RdfToQuadConverter(),
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
