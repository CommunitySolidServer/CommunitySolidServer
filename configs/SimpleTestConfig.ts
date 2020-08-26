import { DATA_TYPE_BINARY } from '../src/util/ContentTypes';
import streamifyArray from 'streamify-array';
import {
  AcceptPreferenceParser,
  AclManager,
  AuthenticatedLdpHandler,
  BasePermissionsExtractor,
  CompositeAsyncHandler,
  ExpressHttpServer,
  HttpHandler,
  Operation,
  ResourceStore,
  ResponseDescription,
  ServerConfig,
  SimpleAuthorizer,
  SimpleBodyParser,
  SimpleCredentialsExtractor,
  SimpleDeleteOperationHandler,
  SimpleExtensionAclManager,
  SimpleGetOperationHandler,
  SimplePostOperationHandler,
  SimpleRequestParser,
  SimpleResourceStore,
  SimpleResponseWriter,
  SimpleTargetExtractor,
} from '..';

// This is the configuration from bin/server.ts

export class SimpleTestConfig implements ServerConfig {
  public base: string;
  public port: number;
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor(port: number) {
    this.port = port;
    this.base = `http://localhost:${port}/`;
    this.store = new SimpleResourceStore('http://test.com/');
    this.aclManager = new SimpleExtensionAclManager();
  }

  public async getHttpServer(): Promise<ExpressHttpServer> {
    const httpServer = new ExpressHttpServer(this.getHandler());

    // Set up acl so everything can still be done by default
    // Note that this will need to be adapted to go through all the correct channels later on
    const aclSetup = async(): Promise<void> => {
      const acl = `@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.
    @prefix  foaf:  <http://xmlns.com/foaf/0.1/>.

    <#authorization>
        a               acl:Authorization;
        acl:agentClass  foaf:Agent;
        acl:mode        acl:Read;
        acl:mode        acl:Write;
        acl:mode        acl:Append;
        acl:mode        acl:Delete;
        acl:mode        acl:Control;
        acl:accessTo    <${this.base}>;
        acl:default     <${this.base}>.`;
      await this.store.setRepresentation(
        await this.aclManager.getAcl({ path: this.base }),
        {
          dataType: DATA_TYPE_BINARY,
          data: streamifyArray([ acl ]),
          metadata: {
            raw: [],
            profiles: [],
            contentType: 'text/turtle',
          },
        },
      );
    };
    await aclSetup();
    return httpServer;
  }

  public getHandler(): HttpHandler {
    const requestParser = new SimpleRequestParser({
      targetExtractor: new SimpleTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new SimpleBodyParser(),
    });

    const credentialsExtractor = new SimpleCredentialsExtractor();
    const permissionsExtractor = new BasePermissionsExtractor();
    const authorizer = new SimpleAuthorizer();

    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new SimpleGetOperationHandler(this.store),
      new SimplePostOperationHandler(this.store),
      new SimpleDeleteOperationHandler(this.store),
    ]);

    const responseWriter = new SimpleResponseWriter();

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
