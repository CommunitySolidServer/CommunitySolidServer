import type {
  DataAccessor,
  HttpHandler,
  ResourceStore,
} from '../../index';
import {
  AuthenticatedLdpHandler,
  FirstCompositeHandler,
  MethodPermissionsExtractor,
  RdfToQuadConverter,
  UnsecureWebIdExtractor,
  QuadToRdfConverter,
} from '../../index';
import type { ServerConfig } from './ServerConfig';
import {
  getConvertingStore,
  getBasicRequestParser,
  getOperationHandler,
  getWebAclAuthorizer,
  getDataAccessorStore,
  getResponseWriter,
} from './Util';

/**
 * AuthenticatedFileResourceStoreConfig works with
 * - a WebAclAuthorizer
 * - a FileResourceStore wrapped in a converting store (rdf to quad & quad to rdf)
 * - GET, POST, PUT & DELETE operation handlers
 */
export class AuthenticatedDataAccessorBasedConfig implements ServerConfig {
  public base: string;
  public store: ResourceStore;

  public constructor(base: string, dataAccessor: DataAccessor) {
    this.base = base;
    this.store = getConvertingStore(
      getDataAccessorStore(base, dataAccessor),
      [ new QuadToRdfConverter(),
        new RdfToQuadConverter() ],
    );
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = getBasicRequestParser();

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new FirstCompositeHandler([
      new MethodPermissionsExtractor(),
    ]);

    const operationHandler = getOperationHandler(this.store);

    const responseWriter = getResponseWriter();
    const authorizer = getWebAclAuthorizer(this.store);

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
