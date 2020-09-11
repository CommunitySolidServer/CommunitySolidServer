import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicResponseWriter,
  CompositeAsyncHandler,
  HttpHandler,
  MethodPermissionsExtractor,
  QuadToRdfConverter,
  RawBodyParser,
  RdfToQuadConverter,
  ResourceStore,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from '../configs/ServerConfig';
import { getFileResourceStore, getOperationHandler, getConvertingStore, getBasicRequestParser } from './Util';

/**
 * FileResourceStoreConfig works with
 * - an AllowEverythingAuthorizer (no acl)
 * - a FileResourceStore wrapped in a converting store (rdf to quad & quad to rdf)
 * - GET, POST, PUT & DELETE operation handlers
 */

export class FileResourceStoreConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor() {
    this.store = getConvertingStore(
      getFileResourceStore(),
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

    const operationHandler = getOperationHandler(this.store, { get: true, put: true, post: true, delete: true });
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
