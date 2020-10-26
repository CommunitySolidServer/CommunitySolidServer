import type { HttpHandler,
  ResourceStore } from '../../index';
import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  MethodPermissionsExtractor,
  UnsecureWebIdExtractor,
} from '../../index';
import type { ServerConfig } from './ServerConfig';
import { getOperationHandler, getInMemoryResourceStore, getBasicRequestParser, getResponseWriter } from './Util';

/**
 * BasicConfig works with
 * - an AllowEverythingAuthorizer (no acl)
 * - an InMemoryResourceStore
 * - GET, POST & DELETE operation handlers
 */

export class BasicConfig implements ServerConfig {
  public store: ResourceStore;

  public constructor() {
    this.store = getInMemoryResourceStore();
  }

  public getHttpHandler(): HttpHandler {
    const requestParser = getBasicRequestParser();

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new MethodPermissionsExtractor();
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
