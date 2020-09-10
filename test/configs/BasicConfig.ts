import {
  AcceptPreferenceParser,

  AllowEverythingAuthorizer,
  AuthenticatedLdpHandler,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  HttpHandler,

  MethodPermissionsExtractor,
  RawBodyParser,
  ResourceStore,
  UnsecureWebIdExtractor,
} from '../../index';
import { ServerConfig } from '../configs/ServerConfig';
import { getOperationHandler, getInMemoryResourceStore } from './Util';

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
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new MethodPermissionsExtractor();
    const authorizer = new AllowEverythingAuthorizer();

    const operationHandler = getOperationHandler(this.store, { get: true, post: true, delete: true });

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
