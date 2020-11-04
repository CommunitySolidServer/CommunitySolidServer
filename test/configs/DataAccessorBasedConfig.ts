import type {
  DataAccessor,
  HttpHandler,
  ResourceStore,
} from '../../index';
import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  FirstCompositeHandler,
  MethodPermissionsExtractor,
  QuadToRdfConverter,
  RawBodyParser,
  RdfToQuadConverter,
  UnsecureWebIdExtractor,
} from '../../index';
import type { ServerConfig } from './ServerConfig';
import {
  getOperationHandler,
  getConvertingStore,
  getBasicRequestParser,
  getDataAccessorStore,
  getResponseWriter,
} from './Util';

/**
 * DataAccessorBasedConfig works with
 * - an AllowEverythingAuthorizer (no acl)
 * - a DataAccessorBasedStore with a FileDataAccessor wrapped in a converting store (rdf to quad & quad to rdf)
 * - GET, POST, PUT & DELETE operation handlers
 */
export class DataAccessorBasedConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor(base: string, dataAccessor: DataAccessor, inType?: string) {
    this.store = getConvertingStore(
      getDataAccessorStore(base, dataAccessor),
      [ new QuadToRdfConverter(), new RdfToQuadConverter() ],
      inType,
    );
  }

  public getHttpHandler(): HttpHandler {
    // This is for the sake of test coverage, as it could also be just getBasicRequestParser()
    const requestParser = getBasicRequestParser([ new RawBodyParser() ]);

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new FirstCompositeHandler([
      new MethodPermissionsExtractor(),
    ]);
    const authorizer = new AllowEverythingAuthorizer();

    const operationHandler = getOperationHandler(this.store);
    const responseWriter = getResponseWriter();

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
