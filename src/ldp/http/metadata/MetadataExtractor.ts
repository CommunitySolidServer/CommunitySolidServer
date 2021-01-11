import type { HttpRequest } from '../../../server/HttpRequest';
import { AsyncHandler } from '../../../util/AsyncHandler';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';

/**
 * Parses the metadata of a {@link HttpRequest} into a {@link RepresentationMetadata}.
 */
export abstract class MetadataExtractor extends
  AsyncHandler<{ request: HttpRequest }, RepresentationMetadata> {}
