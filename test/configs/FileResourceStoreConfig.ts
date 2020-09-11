import {
  AcceptPreferenceParser,
  AllowEverythingAuthorizer,
  AclManager,
  AuthenticatedLdpHandler,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  CompositeAsyncHandler,
  DeleteOperationHandler,
  FileResourceStore,
  GetOperationHandler,
  HttpHandler,
  InteractionController,
  MetadataController,
  MethodPermissionsExtractor,
  Operation,
  PostOperationHandler,
  PutOperationHandler,
  QuadToTurtleConverter,
  RawBodyParser,
  RepresentationConvertingStore,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
  TurtleToQuadConverter,
  UrlBasedAclManager,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from '../configs/ServerConfig';

export class FileResourceStoreConfig implements ServerConfig {
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.store = new FileResourceStore(
      new RuntimeConfig({
        base: 'http://test.com',
        rootFilepath: 'uploads',
      }),
      new InteractionController(),
      new MetadataController(),
    );

    this.aclManager = new UrlBasedAclManager();
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new MethodPermissionsExtractor(),
    ]);
    const authorizer = new AllowEverythingAuthorizer();

    const converter = new CompositeAsyncHandler([
      new QuadToTurtleConverter(),
      new TurtleToQuadConverter(),
    ]);
    const convertingStore = new RepresentationConvertingStore(this.store, converter);

    const operationHandler = new CompositeAsyncHandler<
    Operation,
    ResponseDescription
    >([
      new GetOperationHandler(convertingStore),
      new PostOperationHandler(convertingStore),
      new DeleteOperationHandler(convertingStore),
      new PutOperationHandler(convertingStore),
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
