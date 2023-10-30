import { PassThrough, Readable } from 'node:stream';
import { Validator } from '../../http/auxiliary/Validator';
import type { ValidatorInput } from '../../http/auxiliary/Validator';
import type { Representation } from '../../http/representation/Representation';
import { PayloadHttpError } from '../../util/errors/PayloadHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import { pipeSafely } from '../../util/StreamUtil';
import type { QuotaStrategy } from '../quota/QuotaStrategy';

/**
 * The QuotaValidator validates data streams by making sure they would not exceed the limits of a QuotaStrategy.
 */
export class QuotaValidator extends Validator {
  private readonly strategy: QuotaStrategy;

  public constructor(strategy: QuotaStrategy) {
    super();
    this.strategy = strategy;
  }

  public async handle({ representation, identifier }: ValidatorInput): Promise<Representation> {
    const { data, metadata } = representation;

    // 1. Get the available size
    const availableSize = await this.strategy.getAvailableSpace(identifier);

    // 2. Check if the estimated size is bigger then the available size
    const estimatedSize = await this.strategy.estimateSize(metadata);

    if (estimatedSize && availableSize.amount < estimatedSize.amount) {
      return {
        ...representation,
        data: guardStream(new Readable({
          read(this): void {
            this.destroy(new PayloadHttpError(
              `Quota exceeded: Advertised Content-Length is ${estimatedSize.amount} ${estimatedSize.unit} ` +
              `and only ${availableSize.amount} ${availableSize.unit} is available`,
            ));
          },
        })),
      };
    }

    // 3. Track if quota is exceeded during writing
    const tracking: Guarded<PassThrough> = await this.strategy.createQuotaGuard(identifier);

    // 4. Double check quota is not exceeded after write (concurrent writing possible)
    const afterWrite = new PassThrough({
      // eslint-disable-next-line ts/no-misused-promises
      flush: async(done): Promise<void> => {
        const availableSpace = (await this.strategy.getAvailableSpace(identifier)).amount;
        done(availableSpace < 0 ? new PayloadHttpError('Quota exceeded after write completed') : undefined);
      },
    });

    return {
      ...representation,
      data: pipeSafely(pipeSafely(data, tracking), afterWrite),
    };
  }
}
