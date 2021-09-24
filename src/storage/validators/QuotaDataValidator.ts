import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { pipeSafely } from '../../util/StreamUtil';
import type { QuotaStrategy } from '../quota-strategy/QuotaStrategy';
import type { DataValidator } from './DataValidator';

/**
 * The QuotaDataValidator validates data streams according to a QuotaStrategy's implementation
 */
export class QuotaDataValidator implements DataValidator {
  private readonly strategy: QuotaStrategy;

  public constructor(strategy: QuotaStrategy) {
    this.strategy = strategy;
  }

  public async validateRepresentation(
    identifier: ResourceIdentifier,
    data: Guarded<Readable>,
    metadata: RepresentationMetadata,
  ): Promise<Guarded<Readable>> {
    // 1. Get the available size
    const availableSize = this.strategy.getAvailableSpace(identifier);

    // 2. Check if the estimated size is bigger then the available size
    const estimatedSize = this.strategy.estimateSize(metadata);
    if (estimatedSize && availableSize.amount < estimatedSize.amount) {
      data.destroy();
      return data;
    }

    // 3. Track if quota is exceeded during writing
    const trackedSpace = this.strategy.trackAvailableSpace(identifier, data, metadata);
    trackedSpace.on('data', (chunk: any): void => {
      if (chunk && Number(chunk) < 0) {
        data.destroy();
        trackedSpace.destroy();
      }
    });

    // 4. Double check quota is not exceeded after write (concurrent writing possible)
    const passthrough = new PassThrough({
      flush: (done): void => {
        const availableSpace = this.strategy.getAvailableSpace(identifier).amount;
        done(availableSpace < 0 ? new Error('Quota exceeded after write completed') : undefined);
      },
    });

    return pipeSafely(data, passthrough);
  }
}
