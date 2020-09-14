import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicResponseWriter,
  HttpHandler,
  MethodPermissionsExtractor,
  ResourceStore,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from './ServerConfig';
import { getOperationHandler, getInMemoryResourceStore, getBasicRequestParser } from './Util';

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
