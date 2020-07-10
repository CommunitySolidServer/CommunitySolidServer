import yargs from 'yargs';
import {
  AcceptPreferenceParser,
  AuthenticatedLdpHandler,
  CompositeAsyncHandler,
  ExpressHttpServer,
  Operation,
  ResponseDescription,
  SimpleAuthorizer,
  SimpleBodyParser,
  SimpleCredentialsExtractor,
  SimpleDeleteOperationHandler,
  SimpleGetOperationHandler,
  SimplePermissionsExtractor,
  SimplePostOperationHandler,
  SimpleRequestParser,
  SimpleResourceStore,
  SimpleResponseWriter,
  SimpleTargetExtractor,
} from '..';

const { argv } = yargs
  .usage('node ./bin/server.js [args]')
  .options({
    port: { type: 'number', alias: 'p', default: 3000 },
  })
  .help();

const { port } = argv;

// This is instead of the dependency injection that still needs to be added
const requestParser = new SimpleRequestParser({
  targetExtractor: new SimpleTargetExtractor(),
  preferenceParser: new AcceptPreferenceParser(),
  bodyParser: new SimpleBodyParser(),
});

const credentialsExtractor = new SimpleCredentialsExtractor();
const permissionsExtractor = new SimplePermissionsExtractor();
const authorizer = new SimpleAuthorizer();

// Will have to see how to best handle this
const store = new SimpleResourceStore(`http://localhost:${port}/`);
const operationHandler = new CompositeAsyncHandler<Operation, ResponseDescription>([
  new SimpleGetOperationHandler(store),
  new SimplePostOperationHandler(store),
  new SimpleDeleteOperationHandler(store),
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
