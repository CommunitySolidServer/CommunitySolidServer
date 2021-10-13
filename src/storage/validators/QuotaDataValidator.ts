import { Readable, PassThrough } from 'stream';
import { PayloadHttpError } from '../../util/errors/PayloadHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { pipeSafely } from '../../util/StreamUtil';
import type { QuotaStrategy } from '../quota/QuotaStrategy';
import type { DataValidatorInput } from './DataValidator';
import { DataValidator } from './DataValidator';

/**
 * The QuotaDataValidator validates data streams according to a QuotaStrategy's implementation
 */
export class QuotaDataValidator extends DataValidator {
  private readonly strategy: QuotaStrategy;

  public constructor(strategy: QuotaStrategy) {
    super();
    this.strategy = strategy;
  }

  public async handle(input: DataValidatorInput): Promise<Guarded<Readable>> {
    const { identifier, data, metadata } = input;

    // 1. Get the available size
    const availableSize = await this.strategy.getAvailableSpace(identifier);

    // 2. Check if the estimated size is bigger then the available size
    const estimatedSize = await this.strategy.estimateSize(metadata);

    if (estimatedSize && availableSize.amount < estimatedSize.amount) {
      return guardStream(new Readable({
        // We need a regular function to use the `this` pointer
        // eslint-disable-next-line object-shorthand
        read: function(this): void {
          this.destroy(new PayloadHttpError(
            `Quota exceeded: Advertised Content-Length is ${estimatedSize.amount} ${estimatedSize.unit} ` +
            `and only ${availableSize.amount} ${availableSize.unit} is available`,
          ));
        },
      }));
    }

    // 3. Track if quota is exceeded during writing
    const tracking: Guarded<PassThrough> = await this.strategy.trackAvailableSpace(identifier, data, metadata);

    // 4. Double check quota is not exceeded after write (concurrent writing possible)
    const afterWrite = new PassThrough({
      flush: async(done): Promise<void> => {
        const availableSpace = (await this.strategy.getAvailableSpace(identifier)).amount;
        done(availableSpace < 0 ? new PayloadHttpError('Quota exceeded after write completed') : undefined);
      },
    });

    return pipeSafely(pipeSafely(data, tracking), afterWrite);
  }
}
