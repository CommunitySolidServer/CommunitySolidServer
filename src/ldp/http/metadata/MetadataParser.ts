import type { HttpRequest } from '../../../server/HttpRequest';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';

/**
 * A parser that takes a specific part of an HttpRequest and converts it to medata,
 * such as the value of a header entry.
 */
export interface MetadataParser {
  /**
   * Potentially adds metadata to the RepresentationMetadata based on the HttpRequest contents.
   * @param request - Request with potential metadata.
   * @param metadata - Metadata objects that should be updated.
   */
  parse: (request: HttpRequest, metadata: RepresentationMetadata) => Promise<void>;
}
