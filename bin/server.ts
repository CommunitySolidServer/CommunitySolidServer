#!/usr/bin/env node
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
import { Setup } from '../src/init/Setup';

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
const store = new SimpleResourceStore(base);
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

const setup = new Setup(httpServer, store, aclManager);
setup.setup(port, base).then((): void => {
  process.stdout.write(`Running at ${base}\n`);
}).catch((error): void => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
