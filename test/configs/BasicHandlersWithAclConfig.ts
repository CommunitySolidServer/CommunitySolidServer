import type { HttpHandler,
  ResourceStore } from '../../index';
import {
  AuthenticatedLdpHandler,
  CompositeAsyncHandler,
  MethodPermissionsExtractor,
  RdfToQuadConverter,
  UnsecureWebIdExtractor,
  QuadToRdfConverter,
} from '../../index';
import type { ServerConfig } from './ServerConfig';
import {
  getInMemoryResourceStore,
  getConvertingStore,
  getBasicRequestParser,
  getOperationHandler,
  getWebAclAuthorizer,
  getResponseWriter,
} from './Util';

/**
 * BasicHandlersWithAclConfig works with
 * - an WebAclAuthorizer
 * - an InMemoryResourceStore wrapped in a converting store & wrapped in a patching store
 * - GET, POST, PUT, PATCH & DELETE operation handlers
 */

export class BasicHandlersWithAclConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor() {
    this.store = getConvertingStore(
      getInMemoryResourceStore(),
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
