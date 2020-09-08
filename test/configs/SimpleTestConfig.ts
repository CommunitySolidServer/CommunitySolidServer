import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  CompositeAsyncHandler,
  HttpHandler,
  Operation,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
} from '../..';
import { UnsecureWebIdExtractor } from '../../src/authentication/UnsecureWebIdExtractor';
import { AllowEverythingAuthorizer } from '../../src/authorization/AllowEverythingAuthorizer';
import { UrlBasedAclManager } from '../../src/authorization/UrlBasedAclManager';
import { BasicRequestParser } from '../../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../../src/ldp/http/BasicTargetExtractor';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { DeleteOperationHandler } from '../../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../../src/ldp/operations/GetOperationHandler';
import { PostOperationHandler } from '../../src/ldp/operations/PostOperationHandler';
import { MethodPermissionsExtractor } from '../../src/ldp/permissions/MethodPermissionsExtractor';
import { InMemoryResourceStore } from '../../src/storage/InMemoryResourceStore';
import { ServerConfig } from '../configs/ServerConfig';

export class SimpleTestConfig implements ServerConfig {
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    this.aclManager = new UrlBasedAclManager();
  }

  public getHandler(): HttpHandler {
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
