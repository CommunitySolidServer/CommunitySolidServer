import {
  AcceptPreferenceParser,
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  CompositeAsyncHandler,
  HttpHandler,
  MethodPermissionsExtractor,
  QuadToTurtleConverter,
  RawBodyParser,
  ResourceStore,
  TurtleToQuadConverter,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from '../configs/ServerConfig';
import { getFileResourceStore, getOperationHandler, getConvertingStore } from './Util';

// This is the configuration from bin/server.ts

export class FileResourceStoreConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor() {
    this.store = getConvertingStore(
      getFileResourceStore(),
      [ new QuadToTurtleConverter(), new TurtleToQuadConverter() ],
    );
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

    const operationHandler = getOperationHandler(this.store);
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
