import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  CompositeAsyncHandler,
  HttpHandler,
  InteractionController,
  MetadataController,
  Operation,
  QuadToTurtleConverter,
  RepresentationConvertingStore,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
  TurtleToQuadConverter,
  UrlBasedAclManager,
  WebAclAuthorizer,
} from '../..';
import { UnsecureWebIdExtractor } from '../../src/authentication/UnsecureWebIdExtractor';
import { RawBodyParser } from '../../src/ldp/http/RawBodyParser';
import { DeleteOperationHandler } from '../../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../../src/ldp/operations/GetOperationHandler';
import { PostOperationHandler } from '../../src/ldp/operations/PostOperationHandler';
import { PutOperationHandler } from '../../src/ldp/operations/PutOperationHandler';
import { MethodPermissionsExtractor } from '../../src/ldp/permissions/MethodPermissionsExtractor';
import { FileResourceStore } from '../../src/storage/FileResourceStore';
import { UrlContainerManager } from '../../src/storage/UrlContainerManager';
import { ServerConfig } from '../configs/ServerConfig';

// This is the configuration from bin/server.ts

export class AuthenticatedFileResourceStoreConfig implements ServerConfig {
  public store: ResourceStore;
  public aclManager: AclManager;
  public runtimeConfig: RuntimeConfig;

  public constructor() {
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

  public getHandler(): HttpHandler {
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new MethodPermissionsExtractor(),
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
