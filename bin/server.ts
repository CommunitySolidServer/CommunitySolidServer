import yargs from 'yargs';
import {
  AcceptPreferenceParser,
  AuthenticatedLdpHandler,
  CompositeAsyncHandler,
  ExpressHttpServer,
  HttpRequest,
  PatchingStore,
  QuadToTurtleConverter,
  Representation,
  RepresentationConvertingStore,
  SimpleAuthorizer,
  SimpleBodyParser,
  SimpleCredentialsExtractor,
  SimpleDeleteOperationHandler,
  SimpleGetOperationHandler,
  SimplePatchOperationHandler,
  SimplePermissionsExtractor,
  SimplePostOperationHandler,
  SimpleRequestParser,
  SimpleResourceStore,
  SimpleResponseWriter,
  SimpleSparqlUpdateBodyParser,
  SimpleSparqlUpdatePatchHandler,
  SimpleTargetExtractor,
  SingleThreadedResourceLocker,
  TurtleToQuadConverter,
} from '..';

const { argv } = yargs
  .usage('node ./bin/server.js [args]')
  .options({
    port: { type: 'number', alias: 'p', default: 3000 },
  })
  .help();

const { port } = argv;

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
const permissionsExtractor = new SimplePermissionsExtractor();
const authorizer = new SimpleAuthorizer();

// Will have to see how to best handle this
const store = new SimpleResourceStore(`http://localhost:${port}/`);
const converter = new CompositeAsyncHandler([
  new TurtleToQuadConverter(),
  new QuadToTurtleConverter(),
]);
const convertingStore = new RepresentationConvertingStore(store, converter);
const locker = new SingleThreadedResourceLocker();
const patcher = new SimpleSparqlUpdatePatchHandler(convertingStore, locker);
const patchingStore = new PatchingStore(convertingStore, patcher);

const operationHandler = new CompositeAsyncHandler([
  new SimpleDeleteOperationHandler(patchingStore),
  new SimpleGetOperationHandler(patchingStore),
  new SimplePatchOperationHandler(patchingStore),
  new SimplePostOperationHandler(patchingStore),
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

httpServer.listen(port);

process.stdout.write(`Running at http://localhost:${port}/\n`);
