import {
  AcceptPreferenceParser,
  AclManager,
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  CompositeAsyncHandler,
  DeleteOperationHandler,
  GetOperationHandler,
  HttpHandler,
  InMemoryResourceStore,
  MethodPermissionsExtractor,
  Operation,
  PostOperationHandler,
  RawBodyParser,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
  UrlBasedAclManager,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from '../configs/ServerConfig';

export class BasicConfig implements ServerConfig {
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    this.aclManager = new UrlBasedAclManager();
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new MethodPermissionsExtractor();
    const authorizer = new AllowEverythingAuthorizer();

    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new GetOperationHandler(this.store),
      new PostOperationHandler(this.store),
      new DeleteOperationHandler(this.store),
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
