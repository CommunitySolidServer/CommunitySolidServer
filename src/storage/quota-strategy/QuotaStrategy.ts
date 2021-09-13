import type { Readable } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import type { Size } from '../size-reporter/size.model';

export interface QuotaStrategy {

  getAvailableSpace: (identifier: ResourceIdentifier) => Size;
  estimateSize: (metadata: RepresentationMetadata) => Size;
  trackAvailableSpace: (
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ) => Guarded<Readable>;

}
