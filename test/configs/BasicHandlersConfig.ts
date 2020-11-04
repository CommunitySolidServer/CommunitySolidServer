import type { HttpHandler,
  ResourceStore } from '../../index';
import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  FirstCompositeHandler,
  MethodPermissionsExtractor,
  QuadToRdfConverter,
  RawBodyParser,
  RdfToQuadConverter,
  SparqlUpdateBodyParser,
  SparqlPatchPermissionsExtractor,
  UnsecureWebIdExtractor,
} from '../../index';

import type { ServerConfig } from './ServerConfig';
import {
  getInMemoryResourceStore,
  getOperationHandler,
  getConvertingStore,
  getPatchingStore,
  getBasicRequestParser,
  getResponseWriter,
} from './Util';

/**
 * BasicHandlersConfig works with
 * - an AllowEverythingAuthorizer (no acl)
 * - an InMemoryResourceStore wrapped in a converting store & wrapped in a patching store
 * - GET, POST, PUT, PATCH & DELETE operation handlers
 */

export class BasicHandlersConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor() {
    const convertingStore = getConvertingStore(
      getInMemoryResourceStore(),
      [ new QuadToRdfConverter(), new RdfToQuadConverter() ],
    );
    this.store = getPatchingStore(convertingStore);
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = getBasicRequestParser([
      new SparqlUpdateBodyParser(),
      new RawBodyParser(),
    ]);

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new FirstCompositeHandler([
      new MethodPermissionsExtractor(),
      new SparqlPatchPermissionsExtractor(),
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
