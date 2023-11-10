import type { Readable } from 'node:stream';
import type { Guarded } from '../../../util/GuardedStream';
import { SOLID_HTTP } from '../../../util/Vocabularies';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a 200 or 206 response, containing relevant metadata and potentially data.
 * A 206 will be returned if range metadata is found in the metadata object.
 */
export class OkResponseDescription extends ResponseDescription {
  /**
   * @param metadata - Metadata concerning the response.
   * @param data - Potential data. @ignored
   */
  public constructor(metadata: RepresentationMetadata, data?: Guarded<Readable>) {
    super(metadata.has(SOLID_HTTP.terms.unit) ? 206 : 200, metadata, data);
  }
}
