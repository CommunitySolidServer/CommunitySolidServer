import type {
  HttpHandler,
  ResourceStore,
} from '../../src/index';
import {
  AuthenticatedLdpHandler,
  EmptyCredentialsExtractor,
  MethodPermissionsExtractor,
  RdfToQuadConverter,
  QuadToRdfConverter,
  WaterfallHandler,
} from '../../src/index';
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

    const credentialsExtractor = new EmptyCredentialsExtractor();
    const permissionsExtractor = new WaterfallHandler([
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
