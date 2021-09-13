import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';

export interface DataValidator {
  validateRepresentation: (
    id: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ) => Promise<Guarded<Readable>>;
}
