import { AsyncHandler } from 'asynchronous-handlers';
import type { HttpRequest } from '../../../server/HttpRequest';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';

/**
 * A parser that takes a specific part of an HttpRequest and converts it into metadata,
 * such as the value of a header entry.
 */
export abstract class MetadataParser extends AsyncHandler<{ request: HttpRequest; metadata: RepresentationMetadata }> {}
