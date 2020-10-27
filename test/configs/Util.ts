import { join } from 'path';
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
} from '../../index';
import {
  AcceptPreferenceParser, AllVoidCompositeHandler,
  BasicMetadataExtractor,
  BasicRequestParser,
  BasicResponseWriter,
  BasicTargetExtractor,
  ContentTypeParser,
  DataAccessorBasedStore,
  DeleteOperationHandler,
  ErrorResponseWriter,
  FirstCompositeHandler,
  GetOperationHandler,
  HeadOperationHandler,
  InMemoryDataAccessor,
  LinkRelMetadataWriter,
  LinkTypeParser,
  MappedMetadataWriter,
  MetadataController,
  PatchingStore,
  PatchOperationHandler,
  PostOperationHandler,
  PutOperationHandler,
  RawBodyParser,
  RepresentationConvertingStore,
  SingleThreadedResourceLocker,
  SlugParser,
  SparqlUpdatePatchHandler,
  UrlBasedAclManager,
  UrlContainerManager,
  WebAclAuthorizer,
} from '../../index';
import { CONTENT_TYPE, HTTP, RDF } from '../../src/util/UriConstants';

export const BASE = 'http://test.com';

/**
 * Creates a RuntimeConfig with its rootFilePath set based on the given subfolder.
 * @param subfolder - Folder to use in the global testData folder.
 */
export const getRootFilePath = (subfolder: string): string => join(__dirname, '../testData', subfolder);

/**
 * Gives a file data accessor store based on (default) runtime config.
 * @param base - Base URL.
 * @param rootFilepath - The root file path.
 *
 * @returns The data accessor based store.
 */
export const getDataAccessorStore = (base: string, dataAccessor: DataAccessor): DataAccessorBasedStore =>
  new DataAccessorBasedStore(
    dataAccessor,
    base,
    new MetadataController(),
    new UrlContainerManager(base),
  );

/**
 * Gives an in memory resource store based on (default) base url.
 * @param base - Optional base parameter for the run time config.
 *
 * @returns The in memory resource store.
 */
export const getInMemoryResourceStore = (base = BASE): DataAccessorBasedStore =>
  getDataAccessorStore(base, new InMemoryDataAccessor(BASE, new MetadataController()));

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
    inConverter: new FirstCompositeHandler(converters),
    outConverter: new FirstCompositeHandler(converters),
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
  return new FirstCompositeHandler<Operation, ResponseDescription>(handlers);
};

export const getResponseWriter = (): ResponseWriter => {
  const serializer = new AllVoidCompositeHandler([
    new MappedMetadataWriter({
      [CONTENT_TYPE]: 'content-type',
      [HTTP.location]: 'location',
    }),
    new LinkRelMetadataWriter({
      [RDF.type]: 'type',
    }),
  ]);

  return new FirstCompositeHandler<{ response: HttpResponse; result: ResponseDescription | Error }, void>([
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
    bodyParser = new FirstCompositeHandler(bodyParsers);
  }
  return new BasicRequestParser({
    targetExtractor: new BasicTargetExtractor(),
    preferenceParser: new AcceptPreferenceParser(),
    metadataExtractor: getBasicMetadataExtractor(),
    bodyParser,
  });
};

/**
 * Gives a web acl authorizer, using a UrlContainerManager & based on a (default) runtimeConfig.
 * @param store - Initial resource store.
 * @param base - Base URI of the pod.
 * @param aclManager - Optional acl manager, default is UrlBasedAclManager.
 *
 * @returns The acl authorizer.
 */
export const getWebAclAuthorizer =
(store: ResourceStore, base = BASE, aclManager = new UrlBasedAclManager()): WebAclAuthorizer => {
  const containerManager = new UrlContainerManager(base);
  return new WebAclAuthorizer(aclManager, containerManager, store);
};
