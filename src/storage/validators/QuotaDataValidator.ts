import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { PayloadHttpError } from '../../util/errors/PayloadHttpError';
import type { Guarded } from '../../util/GuardedStream';
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
    const availableSize = await this.strategy.getAvailableSpace(identifier);

    // 2. Check if the estimated size is bigger then the available size
    const estimatedSize = await this.strategy.estimateSize(metadata);
    let estimatedSizeChecked = false;
    const checkEstimateSize = new PassThrough({
      // An arrow function cannot have a 'this' parameter.ts(2730)
      // eslint-disable-next-line object-shorthand
      transform: async function(this: PassThrough, chunk: any, enc: string, done: () => void): Promise<void> {
        if (!estimatedSizeChecked) {
          estimatedSizeChecked = true;
          if (estimatedSize && availableSize.amount < estimatedSize.amount) {
            this.destroy(new PayloadHttpError(
              `Quota exceeded: Advertised Content-Length is ${estimatedSize.amount} ${estimatedSize.unit} ` +
              `and only ${availableSize.amount} ${availableSize.unit} is available`,
            ));
          }
        }
        this.push(chunk);
        done();
      },
    });

    // 3. Track if quota is exceeded during writing
    const tracking: Guarded<PassThrough> = await this.strategy.trackAvailableSpace(identifier, data, metadata);

    // 4. Double check quota is not exceeded after write (concurrent writing possible)
    const afterWrite = new PassThrough({
      flush: async(done): Promise<void> => {
        const availableSpace = (await this.strategy.getAvailableSpace(identifier)).amount;
        done(availableSpace < 0 ? new PayloadHttpError('Quota exceeded after write completed') : undefined);
      },
    });

    return pipeSafely(pipeSafely(pipeSafely(data, checkEstimateSize), tracking), afterWrite);
  }
}
