import {
  AuthenticatedLdpHandler,
  BasicResponseWriter,
  CompositeAsyncHandler,
  HttpHandler,
  MethodPermissionsExtractor,
  RdfToQuadConverter,
  ResourceStore,
  UnsecureWebIdExtractor,
  QuadToRdfConverter,
  RuntimeConfig,
} from '../../index';
import { ServerConfig } from './ServerConfig';
import {
  getFileResourceStore,
  getConvertingStore,
  getBasicRequestParser,
  getOperationHandler,
  getWebAclAuthorizer,
} from './Util';

/**
 * AuthenticatedFileResourceStoreConfig works with
 * - a WebAclAuthorizer
 * - a FileResourceStore wrapped in a converting store (rdf to quad & quad to rdf)
 * - GET, POST, PUT & DELETE operation handlers
 */

export class AuthenticatedFileResourceStoreConfig implements ServerConfig {
  private readonly runtimeConfig: RuntimeConfig;
  public store: ResourceStore;

  public constructor(runtimeConfig: RuntimeConfig) {
    this.runtimeConfig = runtimeConfig;
    this.store = getConvertingStore(
      getFileResourceStore(runtimeConfig),
      [ new QuadToRdfConverter(),
        new RdfToQuadConverter() ],
    );
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = getBasicRequestParser();

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new CompositeAsyncHandler([
      new MethodPermissionsExtractor(),
    ]);

    const operationHandler = getOperationHandler(this.store);

    const responseWriter = new BasicResponseWriter();
    const authorizer = getWebAclAuthorizer(this.store, this.runtimeConfig.base);

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
