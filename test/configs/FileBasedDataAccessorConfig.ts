import type { HttpHandler,
  ResourceStore } from '../../index';
import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicResponseWriter,
  CompositeAsyncHandler,
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
  getFileDataAccessorStore,
} from './Util';

/**
 * FileBasedDataAccessorConfig works with
 * - an AllowEverythingAuthorizer (no acl)
 * - a DataAccessorBasedStore with a FileDataAccessor wrapped in a converting store (rdf to quad & quad to rdf)
 * - GET, POST, PUT & DELETE operation handlers
 */
export class FileBasedDataAccessorConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor(base: string, rootFilepath: string) {
    this.store = getConvertingStore(
      getFileDataAccessorStore(base, rootFilepath),
      [ new QuadToRdfConverter(), new RdfToQuadConverter() ],
    );
  }

  public getHttpHandler(): HttpHandler {
    // This is for the sake of test coverage, as it could also be just getBasicRequestParser()
    const requestParser = getBasicRequestParser([ new RawBodyParser() ]);

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
