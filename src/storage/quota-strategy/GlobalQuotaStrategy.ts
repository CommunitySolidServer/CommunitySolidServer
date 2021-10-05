import type { TransformOptions } from 'stream';
import { PassThrough } from 'stream';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { QuotaError } from '../../util/errors/QuotaError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import type { Size } from '../size-reporter/size.model';
import type { SizeReporter } from '../size-reporter/SizeReporter';
import type { QuotaStrategy } from './QuotaStrategy';

class SpaceTrackingPassthrough extends PassThrough {
  private total = 0;
  private readonly availableAmount: Size;

  public constructor(availableAmount: Size, opts?: TransformOptions) {
    super(opts);
    this.availableAmount = availableAmount;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public async _transform(chunk: any, enc: string, done: () => void): Promise<void> {
    this.total += chunk.length;

    if (this.availableAmount.amount < this.total) {
      this.destroy(new QuotaError(
        `Quota exceeded by ${this.total - this.availableAmount.amount} ${this.availableAmount.unit} during write`,
      ));
    }

    this.push(chunk);
    done();
  }
}

/**
 * The GlobalQuotaStrategy sets a limit on the amount of data stored on the server globally
 */
export class GlobalQuotaStrategy implements QuotaStrategy {
  public readonly limit: Size;
  private readonly reporter: SizeReporter;
  private readonly base: string;

  public constructor(
    limitUnit: string,
    limitAmount: number,
    reporter: SizeReporter,
    base: string,
  ) {
    this.limit = { unit: limitUnit, amount: limitAmount };
    this.reporter = reporter;
    this.base = base;
  }

  public async getAvailableSpace(
    identifier: ResourceIdentifier,
  ): Promise<Size> {
    let used = (await this.reporter.getSize({ path: this.base })).amount;
    // When a file is overwritten the space the file takes up right now should also
    // be counted as available space as it will disappear/be overwritten
    used -= (await this.reporter.getSize(identifier)).amount;

    return {
      amount: this.limit.amount - used,
      unit: this.limit.unit,
    };
  }

  public async estimateSize(metadata: RepresentationMetadata): Promise<Size> {
    return {
      amount: metadata.contentLength ? Number(metadata.contentLength) : 0,
      unit: this.limit.unit,
    };
  }

  public async trackAvailableSpace(
    identifier: ResourceIdentifier,
    // Not using - data: Guarded<Readable>,
    // Not using - metadata: RepresentationMetadata,
  ): Promise<Guarded<PassThrough>> {
    const available = await this.getAvailableSpace(identifier);
    return guardStream(new SpaceTrackingPassthrough(available));
  }
}

