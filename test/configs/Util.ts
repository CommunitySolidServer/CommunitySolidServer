import {
  CompositeAsyncHandler,
  DeleteOperationHandler,
  FileResourceStore,
  GetOperationHandler,
  InteractionController,
  MetadataController,
  Operation,
  PatchOperationHandler,
  PostOperationHandler,
  PutOperationHandler,
  ResourceStore,
  ResponseDescription,
  RuntimeConfig,
} from '../../index';
import { RepresentationConverter } from '../../src/storage/conversion/RepresentationConverter';
import { InMemoryResourceStore } from '../../src/storage/InMemoryResourceStore';
import { RepresentationConvertingStore } from '../../src/storage/RepresentationConvertingStore';

export const getFileResourceStore = (base = 'http://test.com', rootFilepath = 'uploads'): FileResourceStore =>
  new FileResourceStore(
    new RuntimeConfig({ base, rootFilepath }),
    new InteractionController(),
    new MetadataController(),
  );

export const getInMemoryResourceStore = (base = 'http://test.com'): InMemoryResourceStore =>
  new InMemoryResourceStore(new RuntimeConfig({ base }));

export const getOperationHandler = (store: ResourceStore,
  operations: { get?: boolean;
    post?: boolean;
    put?: boolean;
    patch?: boolean;
    delete?: boolean; }): CompositeAsyncHandler<Operation, ResponseDescription> => {
  const handlers = [];
  if (operations.get) {
    handlers.push(new GetOperationHandler(store));
  }
  if (operations.post) {
    handlers.push(new PostOperationHandler(store));
  }
  if (operations.put) {
    handlers.push(new PutOperationHandler(store));
  }
  if (operations.patch) {
    handlers.push(new PatchOperationHandler(store));
  }
  if (operations.delete) {
    handlers.push(new DeleteOperationHandler(store));
  }

  return new CompositeAsyncHandler<Operation, ResponseDescription>(handlers);
};

export const getConvertingStore =
(store: ResourceStore, converters: RepresentationConverter[]): RepresentationConvertingStore =>
  new RepresentationConvertingStore(store, new CompositeAsyncHandler(converters));

