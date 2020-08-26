#!/usr/bin/env node
import { DATA_TYPE_BINARY } from '../src/util/ContentTypes';
import { InteractionController } from '../src/util/InteractionController';
import { ResourceStoreController } from '../src/util/ResourceStoreController';
import streamifyArray from 'streamify-array';
import yargs from 'yargs';
import {
  AcceptPreferenceParser,
  AuthenticatedLdpHandler,
  BasePermissionsExtractor,
  CompositeAsyncHandler,
  ExpressHttpServer,
  HttpRequest,
  PatchingStore,
  QuadToTurtleConverter,
  Representation,
  RepresentationConvertingStore,
  SimpleAclAuthorizer,
  SimpleBodyParser,
  SimpleCredentialsExtractor,
  SimpleDeleteOperationHandler,
  SimpleExtensionAclManager,
  SimpleGetOperationHandler,
  SimplePatchOperationHandler,
  SimplePostOperationHandler,
  SimplePutOperationHandler,
  SimpleRequestParser,
  SimpleResourceStore,
  SimpleResponseWriter,
  SimpleSparqlUpdateBodyParser,
  SimpleSparqlUpdatePatchHandler,
  SimpleTargetExtractor,
  SingleThreadedResourceLocker,
  SparqlPatchPermissionsExtractor,
  TurtleToQuadConverter,
  UrlContainerManager,
} from '..';

const { argv } = yargs
  .usage('node ./bin/server.js [args]')
  .options({
    port: { type: 'number', alias: 'p', default: 3000 },
  })
  .help();

const { port } = argv;

const base = `http://localhost:${port}/`;

// This is instead of the dependency injection that still needs to be added
const bodyParser = new CompositeAsyncHandler<HttpRequest, Representation | undefined>([
  new SimpleSparqlUpdateBodyParser(),
  new SimpleBodyParser(),
]);
const requestParser = new SimpleRequestParser({
  targetExtractor: new SimpleTargetExtractor(),
  preferenceParser: new AcceptPreferenceParser(),
  bodyParser,
});

const credentialsExtractor = new SimpleCredentialsExtractor();
const permissionsExtractor = new CompositeAsyncHandler([
  new BasePermissionsExtractor(),
  new SparqlPatchPermissionsExtractor(),
]);

// Will have to see how to best handle this
const store = new SimpleResourceStore(new ResourceStoreController(base, new InteractionController(), new Set(
  [ DATA_TYPE_BINARY ],
)));
const converter = new CompositeAsyncHandler([
  new TurtleToQuadConverter(),
  new QuadToTurtleConverter(),
]);
const convertingStore = new RepresentationConvertingStore(store, converter);
const locker = new SingleThreadedResourceLocker();
const patcher = new SimpleSparqlUpdatePatchHandler(convertingStore, locker);
const patchingStore = new PatchingStore(convertingStore, patcher);

const aclManager = new SimpleExtensionAclManager();
const containerManager = new UrlContainerManager(base);
const authorizer = new SimpleAclAuthorizer(aclManager, containerManager, patchingStore);

const operationHandler = new CompositeAsyncHandler([
  new SimpleDeleteOperationHandler(patchingStore),
  new SimpleGetOperationHandler(patchingStore),
  new SimplePatchOperationHandler(patchingStore),
  new SimplePostOperationHandler(patchingStore),
  new SimplePutOperationHandler(patchingStore),
]);

const responseWriter = new SimpleResponseWriter();

const httpHandler = new AuthenticatedLdpHandler({
  requestParser,
  credentialsExtractor,
  permissionsExtractor,
  authorizer,
  operationHandler,
  responseWriter,
});

const httpServer = new ExpressHttpServer(httpHandler);

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
    acl:accessTo    <${base}>;
    acl:default     <${base}>.`;
  await store.setRepresentation(
    await aclManager.getAcl({ path: base }),
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
aclSetup().then((): void => {
  httpServer.listen(port);

  process.stdout.write(`Running at ${base}\n`);
}).catch((error): void => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
