import type { Server } from 'http';
import { join } from 'path';
import * as Path from 'path';
import { Loader } from 'componentsjs';
import fetch from 'cross-fetch';
import type {
  BodyParser,
  DataAccessor,
  Operation,
  RepresentationConverter,
  ResourceStore,
  ResponseDescription,
  HttpResponse,
  ResponseWriter,
  OperationHandler,
} from '../../src/index';
import {
  AcceptPreferenceParser,
  BasicMetadataExtractor,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  ContentTypeParser,
  DataAccessorBasedStore,
  DeleteOperationHandler,
  ErrorResponseWriter,
  GetOperationHandler,
  HeadOperationHandler,
  HttpError,
  InMemoryDataAccessor,
  LinkRelMetadataWriter,
  LinkTypeParser,
  MappedMetadataWriter,
  PatchingStore,
  PatchOperationHandler,
  PostOperationHandler,
  PutOperationHandler,
  RawBodyParser,
  RepresentationConvertingStore,
  SequenceHandler,
  SingleRootIdentifierStrategy,
  SingleThreadedResourceLocker,
  SlugParser,
  SparqlUpdatePatchHandler,
  UrlBasedAclManager,
  WaterfallHandler,
  WebAclAuthorizer,
} from '../../src/index';
import { CONTENT_TYPE, HTTP, RDF } from '../../src/util/UriConstants';

export const BASE = 'http://test.com';

/**
 * Creates a RuntimeConfig with its rootFilePath set based on the given subfolder.
 * @param subfolder - Folder to use in the global testData folder.
 */
export const getRootFilePath = (subfolder: string): string => join(__dirname, '../testData', subfolder);

/**
 * Gives a data accessor store with the given data accessor.
 * @param base - Base URL.
 * @param dataAccessor - DataAccessor to use.
 *
 * @returns The data accessor based store.
 */
export const getDataAccessorStore = (base: string, dataAccessor: DataAccessor): DataAccessorBasedStore =>
  new DataAccessorBasedStore(dataAccessor, new SingleRootIdentifierStrategy(base));

/**
 * Gives an in memory resource store based on (default) base url.
 * @param base - Optional base parameter for the run time config.
 *
 * @returns The in memory resource store.
 */
export const getInMemoryResourceStore = (base = BASE): DataAccessorBasedStore =>
  getDataAccessorStore(base, new InMemoryDataAccessor(BASE));

/**
 * Gives a converting store given some converters.
 * @param store - Initial store.
 * @param converters - Converters to be used.
 *
 * @returns The converting store.
 */
export const getConvertingStore =
(store: ResourceStore, converters: RepresentationConverter[], inType?: string):
RepresentationConvertingStore =>
  new RepresentationConvertingStore(store, {
    inConverter: new WaterfallHandler(converters),
    outConverter: new WaterfallHandler(converters),
    inType,
  });

/**
 * Gives a patching store based on initial store.
 * @param store - Initial resource store.
 *
 * @returns The patching store.
 */
export const getPatchingStore = (store: ResourceStore): PatchingStore => {
  const locker = new SingleThreadedResourceLocker();
  const patcher = new SparqlUpdatePatchHandler(store, locker);
  return new PatchingStore(store, patcher);
};

/**
 * Gives an operation handler given a store with all the common operation handlers.
 * @param store - Initial resource store.
 *
 * @returns The operation handler.
 */
export const getOperationHandler = (store: ResourceStore): OperationHandler => {
  const handlers = [
    new GetOperationHandler(store),
    new HeadOperationHandler(store),
    new PostOperationHandler(store),
    new PutOperationHandler(store),
    new PatchOperationHandler(store),
    new DeleteOperationHandler(store),
  ];
  return new WaterfallHandler<Operation, ResponseDescription>(handlers);
};

export const getResponseWriter = (): ResponseWriter => {
  const serializer = new SequenceHandler([
    new MappedMetadataWriter({
      [CONTENT_TYPE]: 'content-type',
      [HTTP.location]: 'location',
    }),
    new LinkRelMetadataWriter({
      [RDF.type]: 'type',
    }),
  ]);

  return new WaterfallHandler<{ response: HttpResponse; result: ResponseDescription | Error }, void>([
    new ErrorResponseWriter(),
    new BasicResponseWriter(serializer),
  ]);
};

/**
 * Creates a BasicMetadataExtractor with parsers for content-type, slugs and link types.
 */
export const getBasicMetadataExtractor = (): BasicMetadataExtractor => new BasicMetadataExtractor([
  new ContentTypeParser(),
  new SlugParser(),
  new LinkTypeParser(),
]);

/**
 * Gives a basic request parser based on some body parses.
 * @param bodyParsers - Optional list of body parsers, default is RawBodyParser.
 *
 * @returns The request parser.
 */
export const getBasicRequestParser = (bodyParsers: BodyParser[] = []): BasicRequestParser => {
  let bodyParser: BodyParser;
  if (bodyParsers.length === 1) {
    bodyParser = bodyParsers[0];
  } else if (bodyParsers.length === 0) {
    // If no body parser is given (array is empty), default to RawBodyParser
    bodyParser = new RawBodyParser();
  } else {
    bodyParser = new WaterfallHandler(bodyParsers);
  }
  return new BasicRequestParser({
    targetExtractor: new BasicTargetExtractor(),
    preferenceParser: new AcceptPreferenceParser(),
    metadataExtractor: getBasicMetadataExtractor(),
    bodyParser,
  });
};

/**
 * Gives a web acl authorizer based on a (default) runtimeConfig.
 * @param store - Initial resource store.
 * @param aclManager - Optional acl manager, default is UrlBasedAclManager.
 *
 * @returns The acl authorizer.
 */
export const getWebAclAuthorizer = (store: ResourceStore, aclManager = new UrlBasedAclManager()): WebAclAuthorizer =>
  new WebAclAuthorizer(aclManager, store, new SingleRootIdentifierStrategy(BASE));

/**
 * Returns a component instantiated from a Components.js configuration.
 */
export const instantiateFromConfig = async(componentUrl: string, configFile: string,
  variables?: Record<string, any>): Promise<any> => {
  // Initialize the Components.js loader
  const mainModulePath = Path.join(__dirname, '../../');
  const loader = new Loader({ mainModulePath });
  await loader.registerAvailableModuleResources();

  // Instantiate the component from the config
  const configPath = Path.join(__dirname, configFile);
  return loader.instantiateFromUrl(componentUrl, configPath, undefined, { variables });
};

/**
 * Initializes the root container of the server.
 * Useful for when the RootContainerInitializer was not instantiated.
 */
export const initServerStore = async(server: Server, baseUrl: string, headers: HeadersInit = {}): Promise<void> => {
  const res = await fetch(baseUrl, {
    method: 'PUT',
    headers: {
      ...headers,
      'content-type': 'text/turtle',
    },
    body: '',
  });
  if (res.status >= 400) {
    throw new HttpError(res.status, 'Error', res.statusText);
  }
};
