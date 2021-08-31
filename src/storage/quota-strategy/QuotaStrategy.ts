import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';

export interface QuotaStrategy {
  limitStream: (
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ) => Promise<Guarded<Readable>>;
}
