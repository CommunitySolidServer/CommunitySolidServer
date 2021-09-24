import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';

/**
 * A DataValidator is used to validate a stream of data.
 * Validation can be checking for bad language, pod quota, ...
 */
export interface DataValidator {

  /**
   * Get a piped stream that has checks in place for specific checking of the given stream
   *
   * @param id - the identifier of the resource
   * @param data - the data stream that belongs to the given identifier that we want to validate
   * @param metadata - the metadata that belongs to the given identifier used for various
   * purposes like estimating the size of the data stream
   * @returns a piped stream with checks that destroy the stream on error
   */
  validateRepresentation: (
    id: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ) => Promise<Guarded<Readable>>;
}
