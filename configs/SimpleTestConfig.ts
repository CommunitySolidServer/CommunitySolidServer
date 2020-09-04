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
  RuntimeConfig,
  ServerConfig,
} from '..';
import { UnsecureWebIdExtractor } from '../src/authentication/UnsecureWebIdExtractor';
import { AllowEverythingAuthorizer } from '../src/authorization/AllowEverythingAuthorizer';
import { UrlBasedAclManager } from '../src/authorization/UrlBasedAclManager';
import { BasicRequestParser } from '../src/ldp/http/BasicRequestParser';
import { BasicResponseWriter } from '../src/ldp/http/BasicResponseWriter';
import { BasicTargetExtractor } from '../src/ldp/http/BasicTargetExtractor';
import { RawBodyParser } from '../src/ldp/http/RawBodyParser';
import { DeleteOperationHandler } from '../src/ldp/operations/DeleteOperationHandler';
import { GetOperationHandler } from '../src/ldp/operations/GetOperationHandler';
import { PostOperationHandler } from '../src/ldp/operations/PostOperationHandler';
import { InMemoryResourceStore } from '../src/storage/InMemoryResourceStore';

export class SimpleTestConfig implements ServerConfig {
  public base: string;
  public store: ResourceStore;
  public aclManager: AclManager;

  public constructor() {
    this.base = `http://test.com/`;
    this.store = new InMemoryResourceStore(new RuntimeConfig({ base: 'http://test.com/' }));
    this.aclManager = new UrlBasedAclManager();
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
          binary: true,
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
    const requestParser = new BasicRequestParser({
      targetExtractor: new BasicTargetExtractor(),
      preferenceParser: new AcceptPreferenceParser(),
      bodyParser: new RawBodyParser(),
    });

    const credentialsExtractor = new UnsecureWebIdExtractor();
    const permissionsExtractor = new BasePermissionsExtractor();
    const authorizer = new AllowEverythingAuthorizer();

    const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
      new GetOperationHandler(this.store),
      new PostOperationHandler(this.store),
      new DeleteOperationHandler(this.store),
    ]);

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
