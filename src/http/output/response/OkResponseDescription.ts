import type { Readable } from 'stream';
import type { Guarded } from '../../../util/GuardedStream';
import type { RepresentationMetadata } from '../../representation/RepresentationMetadata';
import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a 200 response, containing relevant metadata and potentially data.
 */
export class OkResponseDescription extends ResponseDescription {
  /**
   * @param metadata - Metadata concerning the response.
   * @param data - Potential data. @ignored
   */
  public constructor(metadata: RepresentationMetadata, data?: Guarded<Readable>) {
    super(200, metadata, data);
  }
}
