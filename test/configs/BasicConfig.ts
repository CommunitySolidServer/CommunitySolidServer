import type {
  HttpHandler,
  ResourceStore,
} from '../../src/index';
import {
  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  EmptyCredentialsExtractor,
  MethodPermissionsExtractor,
} from '../../src/index';
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

    const credentialsExtractor = new EmptyCredentialsExtractor();
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
